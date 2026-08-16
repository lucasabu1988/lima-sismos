export const SPECTRUM_STATION = {
  net: 'C1',
  sta: 'AP01',
  loc: '--',
  cha: 'BHZ',
  name: 'Chacalluta',
  place: 'Tacna / Arica · borde de placa',
  lat: -18.37084,
  lon: -70.34197,
  spsHint: 40,
}

export interface SpectrumResult {
  station: string
  start: string
  sps: number
  n: number
  peakHz: number
  peakAmp: number
  bins: Array<{ hz: number; amp: number }>
}

export function parseIrisAscii(text: string): { header: string; sps: number; start: string; samples: number[] } {
  const lines = text.trim().split(/\r?\n/)
  const header = lines[0] ?? ''
  const spsMatch = header.match(/([\d.]+)\s+sps/i)
  const startMatch = header.match(/(\d{4}-\d{2}-\d{2}T[\d:.]+)/)
  const samples: number[] = []
  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/)
    const v = Number(parts[parts.length - 1])
    if (Number.isFinite(v)) samples.push(v)
  }
  return {
    header,
    sps: spsMatch ? Number(spsMatch[1]) : 40,
    start: startMatch?.[1] ?? '',
    samples,
  }
}

export function computeSpectrum(samples: number[], sps: number, maxHz = 12): SpectrumResult['bins'] {
  const n = samples.length
  if (n < 32) return []
  const mean = samples.reduce((s, v) => s + v, 0) / n
  const x = samples.map((v) => v - mean)
  const nfft = 1 << Math.floor(Math.log2(n))
  const re = x.slice(0, nfft)
  const im = new Array(nfft).fill(0)
  fft(re, im)
  const bins: Array<{ hz: number; amp: number }> = []
  const half = nfft / 2
  for (let i = 1; i < half; i++) {
    const hz = (i * sps) / nfft
    if (hz > maxHz) break
    const amp = Math.sqrt(re[i] ** 2 + im[i] ** 2) / nfft
    bins.push({ hz: Number(hz.toFixed(3)), amp })
  }
  return bins
}

function fft(re: number[], im: number[]) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wlenRe = Math.cos(ang)
    const wlenIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let wRe = 1
      let wIm = 0
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j]
        const uIm = im[i + j]
        const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm
        const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe
        re[i + j] = uRe + vRe
        im[i + j] = uIm + vIm
        re[i + j + len / 2] = uRe - vRe
        im[i + j + len / 2] = uIm - vIm
        const nRe = wRe * wlenRe - wIm * wlenIm
        wIm = wRe * wlenIm + wIm * wlenRe
        wRe = nRe
      }
    }
  }
}

export function summarizeSpectrum(bins: SpectrumResult['bins'], station: string, start: string, sps: number, n: number): SpectrumResult {
  const peak = bins.reduce((a, b) => (b.amp > a.amp ? b : a), bins[0] ?? { hz: 0, amp: 0 })
  return { station, start, sps, n, peakHz: peak.hz, peakAmp: peak.amp, bins }
}

export async function fetchIrisWindow(hoursAgo: number, durationSec = 60, signal?: AbortSignal): Promise<string> {
  const end = new Date(Date.now() - hoursAgo * 3600_000)
  const start = new Date(end.getTime() - durationSec * 1000)
  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '')
  const { net, sta, loc, cha } = SPECTRUM_STATION
  const qs = new URLSearchParams({
    net,
    sta,
    loc,
    cha,
    starttime: iso(start),
    endtime: iso(end),
    output: 'ascii',
  })
  const res = await fetch(`/iris-api/irisws/timeseries/1/query?${qs}`, { signal })
  if (!res.ok) throw new Error(`IRIS ${res.status}`)
  return res.text()
}
