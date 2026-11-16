// src/hooks/usePrices.js — manages price fetching and WebSocket connection
import { useState, useEffect, useCallback, useRef } from "react"
import { getPrices, connectPriceStream, getMarketStatus } from "../lib/api"

export function usePrices() {
  const [prices,       setPrices]       = useState({})
  const [connected,    setConnected]    = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  // ── CHANGE 5: track whether market is closed so we pause the WS ───────────
  const [marketClosed, setMarketClosed] = useState(false)
  const wsRef = useRef(null)
  const connectedRef = useRef(false)
  const gotPricesRef = useRef(false)
  const retryRef = useRef(null)

  const fetchPrices = useCallback(async (attemptArg = 0) => {
    const attempt = Number.isInteger(attemptArg) ? attemptArg : 0   // refetch may be used as an onClick
    try {
      const data = await getPrices()
      setPrices(data)
      setError(null)
      gotPricesRef.current = true
    } catch (e) {
      setError(e.message)
      // First load failed: retry quickly (2s, 4s, 8s) instead of waiting for the 30s poll.
      if (!gotPricesRef.current && attempt < 3 && !retryRef.current) {
        retryRef.current = setTimeout(() => { retryRef.current = null; fetchPrices(attempt + 1) },
                                      2000 * 2 ** attempt)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => () => { if (retryRef.current) clearTimeout(retryRef.current) }, [])

  // Check market status every 60s — pause WS when closed
  useEffect(() => {
    const check = async () => {
      try {
        const s = await getMarketStatus()
        setMarketClosed(!s.realtime_prices)
      } catch {
        setMarketClosed(false)   // if status check fails, don't gate prices
      }
    }
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Always do an initial REST fetch
    fetchPrices()

    if (marketClosed) {
      // Market closed — close any open WS, stop live updates
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setConnected(false)
      return
    }

    // Market open — connect WebSocket
    const ws = connectPriceStream((msg) => {
      if (msg.type === "prices") {
        setPrices(msg.data)
        setConnected(true)
        connectedRef.current = true
        gotPricesRef.current = true
        setLoading(false)
      }
    })
    wsRef.current = ws
    ws.onopen  = () => { setConnected(true);  connectedRef.current = true }
    ws.onclose = () => { setConnected(false); connectedRef.current = false }
    ws.onerror = () => { setConnected(false); connectedRef.current = false }

    // Polling fallback every 30s if WS disconnects (ref: the state value here would be stale)
    const poll = setInterval(() => {
      if (!connectedRef.current) fetchPrices()
    }, 30_000)

    return () => {
      ws.close()
      wsRef.current = null
      clearInterval(poll)
    }
  }, [fetchPrices, marketClosed])

  return { prices, connected, loading, error, marketClosed, refetch: fetchPrices }
}