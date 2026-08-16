import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const DATA = resolve(import.meta.dirname, '../data')
const OUT = resolve(import.meta.dirname, '../src/data/gnss-series.json')

const STATIONS = [
  { id: 'AREQ', name: 'Arequipa', place: 'Arequipa · antearco' },
  { id: 'AREG', name: 'Arequipa IGS', place: 'Arequipa · estación IGS' },
  { id: 'IAC1', name: 'Chacalluta', place: 'Tacna / frontera · costa sur' },
  { id: 'UTAR', name: 'Arica-Tacna', place: 'extremo sur · fosa' },
]

function parseTenv3(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('site')) continue
    const p = line.trim().split(/\s+/)
    if (p.length < 13) continue
    const year = Number(p[2])
    const east = Number(p[8])
    const north = Number(p[10])
    const up = Number(p[12])
    const lat = Number(p[p.length - 3])
    const lon = Number(p[p.length - 2])
    if (![year, east, north].every(Number.isFinite)) continue
    rows.push({ year, east, north, up, lat, lon })
  }
  return rows
}

function fitMmYr(rows, key) {
  const n = rows.length
  if (n < 30) return null
  const xs = rows.map((r) => r.year)
  const ys = rows.map((r) => r[key] * 1000)
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) ** 2
  }
  return den ? num / den : null
}

const out = { generatedAt: new Date().toISOString(), source: 'Nevada Geodetic Laboratory IGS20 tenv3', stations: [] }

for (const meta of STATIONS) {
  const path = resolve(DATA, `${meta.id}.tenv3`)
  if (!existsSync(path)) {
    console.log('missing', meta.id)
    continue
  }
  const all = parseTenv3(readFileSync(path, 'utf8'))
  const recent = all.filter((r) => r.year >= all[all.length - 1].year - 3)
  const step = Math.max(1, Math.floor(recent.length / 280))
  const series = recent.filter((_, i) => i % step === 0 || i === recent.length - 1).map((r) => ({
    t: Number(r.year.toFixed(4)),
    e: Number((r.east * 1000).toFixed(2)),
    n: Number((r.north * 1000).toFixed(2)),
    u: Number((r.up * 1000).toFixed(2)),
  }))
  const last = all[all.length - 1]
  out.stations.push({
    id: meta.id,
    name: meta.name,
    place: meta.place,
    lat: last.lat,
    lon: last.lon,
    start: all[0].year,
    end: last.year,
    ve: fitMmYr(recent, 'east'),
    vn: fitMmYr(recent, 'north'),
    vu: fitMmYr(recent, 'up'),
    series,
  })
  console.log(meta.id, all.length, '→', series.length, 've', fitMmYr(recent, 'east')?.toFixed(1), 'vn', fitMmYr(recent, 'north')?.toFixed(1))
}

writeFileSync(OUT, JSON.stringify(out))
console.log('wrote', OUT, Buffer.byteLength(JSON.stringify(out)), 'bytes')
