// src/hooks/usePrices.js — manages price fetching and WebSocket connection
import { useState, useEffect, useCallback } from "react"
import { getPrices, connectPriceStream } from "../lib/api"

export function usePrices() {
  const [prices, setPrices]       = useState({})
  const [connected, setConnected] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

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

  useEffect(() => {
    // Initial load via REST
    fetchPrices()

    // Upgrade to WebSocket
    const ws = connectPriceStream((msg) => {
      if (msg.type === "prices") {
        setPrices(msg.data)
        setConnected(true)
        setLoading(false)
      }
    })
    ws.onopen  = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    // Polling fallback every 30s if WS disconnects
    const poll = setInterval(() => {
      if (!connected) fetchPrices()
    }, 30_000)

    return () => {
      ws.close()
      clearInterval(poll)
    }
  }, [fetchPrices])

  return { prices, connected, loading, error, refetch: fetchPrices }
}
