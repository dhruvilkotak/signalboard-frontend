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

  const fetchPrices = useCallback(async () => {
    try {
      const data = await getPrices()
      setPrices(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

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
        setLoading(false)
      }
    })
    wsRef.current = ws
    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    // Polling fallback every 30s if WS disconnects
    const poll = setInterval(() => {
      if (!connected) fetchPrices()
    }, 30_000)

    return () => {
      ws.close()
      wsRef.current = null
      clearInterval(poll)
    }
  }, [fetchPrices, marketClosed])

  return { prices, connected, loading, error, marketClosed, refetch: fetchPrices }
}