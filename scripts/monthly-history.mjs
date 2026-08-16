import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const DATA = resolve(ROOT, 'data')
mkdirSync(DATA, { recursive: true })

const PERU = { minLat: -18.55, maxLat: 0.15, minLon: -81.55, maxLon: -68.55 }
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function inPeru(lat, lon) {
  return lat >= PERU.minLat && lat <= PERU.maxLat && lon >= PERU.minLon && lon <= PERU.maxLon
}

function limaMonth(iso) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(iso))
  return {
    month: Number(parts.find((p) => p.type === 'month')?.value),
    year: Number(parts.find((p) => p.type === 'year')?.value),
  }
}

function parseUsgsCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const out = []
  for (const line of lines.slice(1)) {
    const comma = line.indexOf(',')
    if (comma < 0) continue
    const time = line.slice(0, comma)
    const bits = line.slice(comma + 1).split(',')
    const lat = Number(bits[0])
    const lon = Number(bits[1])
    const mag = Number(bits[3])
    if (!Number.isFinite(Date.parse(time)) || !Number.isFinite(lat) || !Number.isFinite(mag)) continue
    if (!inPeru(lat, lon)) continue
    out.push({ time, lat, lon, mag, source: 'USGS' })
  }
  return out
}

function combineIgp(fecha, hora) {
  if (!fecha || !hora) return null
  const date = String(fecha).slice(0, 10)
  const m = String(hora).match(/T(\d{2}:\d{2}:\d{2})/)
  const clock = m?.[1] ?? '00:00:00'
  const ts = Date.parse(`${date}T${clock}Z`)
  return Number.isFinite(ts) ? new Date(ts).toISOString() : null
}

async function fetchIgpYear(year) {
  const url = `https://ultimosismo.igp.gob.pe/api/ultimo-sismo/ajaxb/${year}`
  const res = await fetch(url, { headers: { 'User-Agent': 'SismoPeru-analisis' } })
  if (!res.ok) return []
  const raw = await res.json()
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const time = combineIgp(item.fecha_utc, item.hora_utc) || combineIgp(item.fecha_local, item.hora_local)
    const lat = Number.parseFloat(item.latitud)
    const lon = Number.parseFloat(item.longitud)
    const mag = Number.parseFloat(item.magnitud)
    if (!time || !Number.isFinite(lat) || !Number.isFinite(mag)) return []
    return [{ time, lat, lon, mag, source: 'IGP' }]
  })
}

function summarize(events, label, { maxInclusiveYear } = {}) {
  const byMonth = Array.from({ length: 12 }, () => 0)
  const byYearMonth = new Map()
  const years = new Set()
  let minYear = Infinity
  let maxYear = -Infinity
  for (const e of events) {
    const { month, year } = limaMonth(e.time)
    if (!month || !year) continue
    if (maxInclusiveYear && year > maxInclusiveYear) continue
    byMonth[month - 1] += 1
    years.add(year)
    minYear = Math.min(minYear, year)
    maxYear = Math.max(maxYear, year)
    const key = `${year}-${month}`
    byYearMonth.set(key, (byYearMonth.get(key) ?? 0) + 1)
  }
  const nYears = years.size || 1
  const total = byMonth.reduce((s, n) => s + n, 0)
  const rows = byMonth.map((count, i) => {
    const averages = [...years].map((y) => byYearMonth.get(`${y}-${i + 1}`) ?? 0)
    const avg = averages.reduce((s, v) => s + v, 0) / nYears
    return {
      month: i + 1,
      name: MONTHS[i],
      count,
      pctHistorical: total ? (count / total) * 100 : 0,
      avgPerYear: avg,
      pctOfYearAvg: (avg / (total / nYears)) * 100,
    }
  })
  return {
    label,
    total,
    minYear,
    maxYear,
    nYears,
    expectedUniformPct: 100 / 12,
    rows,
  }
}

function printBlock(s) {
  const lines = []
  lines.push(`\n=== ${s.label} ===`)
  lines.push(`Eventos: ${s.total} · ${s.minYear}–${s.maxYear} (${s.nYears} años) · uniforme = ${s.expectedUniformPct.toFixed(2)}%`)
  lines.push(
    'Mes'.padEnd(14) +
      'N'.padStart(8) +
      '% histórico'.padStart(14) +
      'prom/año'.padStart(12) +
      '% del año'.padStart(12) +
      'vs unif.'.padStart(12),
  )
  for (const r of s.rows) {
    const vs = r.pctHistorical - s.expectedUniformPct
    lines.push(
      r.name.padEnd(14) +
        String(r.count).padStart(8) +
        `${r.pctHistorical.toFixed(2)}%`.padStart(14) +
        r.avgPerYear.toFixed(2).padStart(12) +
        `${r.pctOfYearAvg.toFixed(2)}%`.padStart(12) +
        `${vs >= 0 ? '+' : ''}${vs.toFixed(2)} pp`.padStart(12),
    )
  }
  return lines.join('\n')
}

const usgsPath = resolve(DATA, 'usgs-peru-m4-1960.csv')
const usgs = parseUsgsCsv(readFileSync(usgsPath, 'utf8'))
console.log('USGS parsed', usgs.length)

const igp = []
for (let y = 2012; y <= 2026; y++) {
  const chunk = await fetchIgpYear(y)
  console.log('IGP', y, chunk.length)
  igp.push(...chunk)
}

const usgsM45 = usgs.filter((e) => e.mag >= 4.5)
const usgsM5 = usgs.filter((e) => e.mag >= 5)
const usgsM6 = usgs.filter((e) => e.mag >= 6)

const reports = [
  summarize(usgs, 'USGS Perú M≥4.0 · catálogo instrumental 1960–2025 (años completos)', { maxInclusiveYear: 2025 }),
  summarize(usgsM45, 'USGS Perú M≥4.5 · 1960–2025', { maxInclusiveYear: 2025 }),
  summarize(usgsM5, 'USGS Perú M≥5.0 · 1960–2025', { maxInclusiveYear: 2025 }),
  summarize(usgsM6, 'USGS Perú M≥6.0 · 1960–2025', { maxInclusiveYear: 2025 }),
  summarize(igp, 'IGP/CENSIS reportes oficiales 2012–2025 (años completos)', { maxInclusiveYear: 2025 }),
]

const text = reports.map(printBlock).join('\n')
console.log(text)

const json = {
  generatedAt: new Date().toISOString(),
  notes: {
    limaTz: 'America/Lima',
    bbox: PERU,
    usgs: 'FDSN event catalog, M≥4.0, 1960-01-01 to present, Peru+fosa bbox',
    igp: 'CENSIS ajaxb yearly reports 2012-2026',
  },
  series: reports,
}
writeFileSync(resolve(DATA, 'monthly-history.json'), JSON.stringify(json, null, 2))
writeFileSync(resolve(DATA, 'monthly-history.txt'), text)
console.log('\nWrote data/monthly-history.json')
