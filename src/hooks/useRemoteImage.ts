import { useEffect, useState } from 'react'
import { fetchImageStamp } from '../lib/sources'

export function useRemoteImage(url?: string, intervalMs = 30_000) {
  const [stamp, setStamp] = useState<number | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!url) {
      setStamp(null)
      setOk(false)
      return
    }
    let cancelled = false
    const pull = async () => {
      try {
        const ts = await fetchImageStamp(url)
        if (cancelled) return
        setStamp(ts)
        setOk(ts != null)
      } catch {
        if (!cancelled) setOk(false)
      }
    }
    void pull()
    const id = window.setInterval(() => void pull(), intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [url, intervalMs])

  const src = url ? `${url}${url.includes('?') ? '&' : '?'}t=${stamp ?? Date.now()}` : null
  const ageMs = stamp != null ? Date.now() - stamp : null
  return { src, stamp, ageMs, ok }
}
