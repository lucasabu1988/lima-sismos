import { useEffect, useState } from 'react'
import {
  computeSpectrum,
  fetchIrisWindow,
  parseIrisAscii,
  SPECTRUM_STATION,
  summarizeSpectrum,
  type SpectrumResult,
} from '../lib/spectrum'

export function useIrisSpectrum(intervalMs = 180_000) {
  const [data, setData] = useState<SpectrumResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let dead = false
    const pull = async () => {
      setLoading(true)
      const delays = [6, 12, 36, 72, 24 * 7]
      let lastErr = 'sin traza'
      for (const h of delays) {
        try {
          const text = await fetchIrisWindow(h, 60)
          if (dead) return
          const parsed = parseIrisAscii(text)
          if (parsed.samples.length < 64) throw new Error('traza corta')
          const bins = computeSpectrum(parsed.samples, parsed.sps)
          setData(summarizeSpectrum(bins, `${SPECTRUM_STATION.net}.${SPECTRUM_STATION.sta}`, parsed.start, parsed.sps, parsed.samples.length))
          setError(null)
          setLoading(false)
          return
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e)
        }
      }
      if (!dead) {
        setError(lastErr)
        setLoading(false)
      }
    }
    void pull()
    const id = window.setInterval(() => void pull(), intervalMs)
    return () => {
      dead = true
      window.clearInterval(id)
    }
  }, [intervalMs])

  return { data, error, loading, station: SPECTRUM_STATION }
}
