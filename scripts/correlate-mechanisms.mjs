import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DATA = resolve(import.meta.dirname, '../data')
const PERU = { minLat: -18.55, maxLat: 0.15, minLon: -81.55, maxLon: -68.55 }
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function limaParts(iso) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date(iso))
  const g = (t) => Number(p.find((x) => x.type === t)?.value)
  return { y: g('year'), m: g('month'), d: g('day') }
}

function parseUsgs(text) {
  return text.trim().split(/\r?\n/).slice(1).flatMap((line) => {
    const c = line.indexOf(',')
    if (c < 0) return []
    const time = line.slice(0, c)
    const b = line.slice(c + 1).split(',')
    const lat = +b[0], lon = +b[1], mag = +b[3]
    if (!Number.isFinite(Date.parse(time)) || !Number.isFinite(mag)) return []
    if (lat < PERU.minLat || lat > PERU.maxLat || lon < PERU.minLon || lon > PERU.maxLon) return []
    const { y, m } = limaParts(time)
    if (y < 1960 || y > 2025) return []
    return [{ time, y, m, mag }]
  })
}

function parsePslMonthly(text) {
  const map = new Map()
  for (const line of text.split(/\r?\n/)) {
    const p = line.trim().split(/\s+/)
    const year = Number(p[0])
    if (!Number.isFinite(year) || year < 1900 || year > 2030 || p.length < 13) continue
    for (let i = 1; i <= 12; i++) {
      const v = Number(p[i])
      if (!Number.isFinite(v) || v < -90) continue
      map.set(`${year}-${i}`, v)
    }
  }
  return map
}

function parseSunspots(text) {
  const map = new Map()
  for (const line of text.split(/\r?\n/)) {
    const p = line.split(';')
    if (p.length < 4) continue
    const y = Number(p[0]), m = Number(p[1]), v = Number(p[3])
    if (y >= 1960 && Number.isFinite(v)) map.set(`${y}-${m}`, v)
  }
  return map
}

/** Lunar age 0=new, 0.5=full. Synodic month from J2000 new moon. */
function moonPhase(iso) {
  const synodic = 29.530588853
  const known = Date.UTC(2000, 0, 6, 18, 14)
  const days = (Date.parse(iso) - known) / 86400000
  return ((days % synodic) + synodic) % synodic / synodic
}

function pearson(xs, ys) {
  const n = xs.length
  if (n < 8) return { r: null, n }
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let num = 0, dx = 0, dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  const r = num / Math.sqrt(dx * dy)
  const t = r * Math.sqrt((n - 2) / (1 - r * r))
  return { r, n, t }
}

function chi2(obs, exp) {
  let s = 0
  for (let i = 0; i < obs.length; i++) s += (obs[i] - exp[i]) ** 2 / Math.max(exp[i], 0.5)
  return s
}

const quakes = parseUsgs(readFileSync(resolve(DATA, 'usgs-peru-m4-1960.csv'), 'utf8'))
const oni = parsePslMonthly(readFileSync(resolve(DATA, 'oni.data'), 'utf8'))
const soi = parsePslMonthly(readFileSync(resolve(DATA, 'soi.data'), 'utf8'))
const ss = parseSunspots(readFileSync(resolve(DATA, 'sunspots.csv'), 'utf8'))

function ensoPhase(v) {
  if (v == null) return 'na'
  if (v >= 0.5) return 'nino'
  if (v <= -0.5) return 'nina'
  return 'neutral'
}

function hydroSeason(m) {
  if (m === 12 || m <= 3) return 'humedo' // DJFM Andes/Amazon peak
  if (m >= 6 && m <= 9) return 'seco' // JJAS
  return 'transicion'
}

const months = []
for (let y = 1960; y <= 2025; y++) {
  for (let m = 1; m <= 12; m++) {
    const key = `${y}-${m}`
    const ev = quakes.filter((q) => q.y === y && q.m === m)
    months.push({
      y, m, key,
      n4: ev.length,
      n5: ev.filter((q) => q.mag >= 5).length,
      n6: ev.filter((q) => q.mag >= 6).length,
      n7: ev.filter((q) => q.mag >= 7).length,
      energy: ev.reduce((s, q) => s + 10 ** (1.5 * q.mag), 0),
      oni: oni.get(key) ?? null,
      soi: soi.get(key) ?? null,
      ss: ss.get(key) ?? null,
      phase: ensoPhase(oni.get(key)),
      hydro: hydroSeason(m),
    })
  }
}

const usable = months.filter((x) => x.oni != null)

function rateBy(groupFn, field = 'n4') {
  const bags = new Map()
  for (const row of usable) {
    const g = groupFn(row)
    if (!bags.has(g)) bags.set(g, { months: 0, events: 0, n6: 0, n7: 0 })
    const b = bags.get(g)
    b.months += 1
    b.events += row[field]
    b.n6 += row.n6
    b.n7 += row.n7
  }
  const out = {}
  for (const [k, v] of bags) {
    out[k] = {
      months: v.months,
      events: v.events,
      rate: v.events / v.months,
      rate6: v.n6 / v.months,
      rate7: v.n7 / v.months,
      timePct: (v.months / usable.length) * 100,
      eventPct: (v.events / usable.reduce((s, r) => s + r[field], 0)) * 100,
    }
  }
  return out
}

const ensoN4 = rateBy((r) => r.phase, 'n4')
const hydroN4 = rateBy((r) => r.hydro, 'n4')
const hydroN6 = rateBy((r) => r.hydro, 'n6')

const pairs = usable.filter((r) => r.oni != null)
const rOniN4 = pearson(pairs.map((r) => r.oni), pairs.map((r) => r.n4))
const rOniN6 = pearson(pairs.map((r) => r.oni), pairs.map((r) => r.n6))
const rSoiN4 = pearson(
  usable.filter((r) => r.soi != null).map((r) => r.soi),
  usable.filter((r) => r.soi != null).map((r) => r.n4),
)
const rSsN4 = pearson(
  usable.filter((r) => r.ss != null).map((r) => r.ss),
  usable.filter((r) => r.ss != null).map((r) => r.n4),
)
const rOniE = pearson(pairs.map((r) => r.oni), pairs.map((r) => Math.log10(r.energy + 1)))

const big = quakes.filter((q) => q.mag >= 6)
const syzygy = [0, 0]
const quad = [0, 0]
const bins = [0, 0, 0, 0]
for (const q of big) {
  const ph = moonPhase(q.time)
  if (ph < 0.125 || ph >= 0.875) bins[0]++
  else if (ph < 0.375) bins[1]++
  else if (ph < 0.625) bins[2]++
  else bins[3]++
  if (ph < 0.125 || ph >= 0.875 || (ph >= 0.375 && ph < 0.625)) syzygy[0]++
  else quad[0]++
}
const nBig = big.length
const tideChi = chi2(bins, [nBig / 4, nBig / 4, nBig / 4, nBig / 4])
const big7 = quakes.filter((q) => q.mag >= 7)
const bins7 = [0, 0, 0, 0]
for (const q of big7) {
  const ph = moonPhase(q.time)
  if (ph < 0.125 || ph >= 0.875) bins7[0]++
  else if (ph < 0.375) bins7[1]++
  else if (ph < 0.625) bins7[2]++
  else bins7[3]++
}

function reportRate(title, obj) {
  console.log('\n' + title)
  for (const [k, v] of Object.entries(obj)) {
    console.log(
      `  ${k.padEnd(12)} meses=${String(v.months).padStart(4)}  M≥4=${v.events}  tasa=${v.rate.toFixed(3)}/mes  ` +
        `tiempo=${v.timePct.toFixed(1)}%  eventos=${v.eventPct.toFixed(1)}%  ` +
        `M≥6 tasa=${v.rate6.toFixed(3)}  M≥7 tasa=${v.rate7.toFixed(4)}`,
    )
  }
}

console.log('meses con ONI', usable.length, 'sismos M≥4', usable.reduce((s, r) => s + r.n4, 0))
reportRate('ENSO (ONI ±0.5)', ensoN4)
reportRate('Estación hidrológica (proxy lluvia Andes/Amazonía)', hydroN4)
console.log('\nCorrelaciones Pearson (mensual 1960–2025)')
console.log('  ONI vs N(M≥4)     r=', rOniN4.r?.toFixed(3), 'n=', rOniN4.n)
console.log('  ONI vs N(M≥6)     r=', rOniN6.r?.toFixed(3), 'n=', rOniN6.n)
console.log('  ONI vs log energía r=', rOniE.r?.toFixed(3), 'n=', rOniE.n)
console.log('  SOI vs N(M≥4)     r=', rSoiN4.r?.toFixed(3), 'n=', rSoiN4.n)
console.log('  manchas vs N(M≥4) r=', rSsN4.r?.toFixed(3), 'n=', rSsN4.n)

console.log('\nMarea / fase lunar (M≥6, n=' + nBig + ')')
console.log('  luna nueva', bins[0], 'cuarto creciente', bins[1], 'llena', bins[2], 'cuarto menguante', bins[3])
console.log('  esperado uniforme', (nBig / 4).toFixed(1), '  chi²=', tideChi.toFixed(2), '(3 gl, 5%≈7.81)')
console.log('  sicigia (nueva+llena)', bins[0] + bins[2], 'cuadratura', bins[1] + bins[3])
console.log('M≥7 fase lunar n=' + big7.length, bins7)

const nino = ensoN4.nino, nina = ensoN4.nina, neu = ensoN4.neutral
const ratioNino = nino.rate / neu.rate
const ratioNina = nina.rate / neu.rate
const ratioHydro = hydroN4.humedo.rate / hydroN4.seco.rate
const ratioHydro6 = hydroN6.humedo.rate6 / hydroN6.seco.rate6

const out = {
  generatedAt: new Date().toISOString(),
  window: '1960-2025 America/Lima',
  catalog: 'USGS M≥4 Peru+fosa',
  enso: ensoN4,
  hydro: hydroN4,
  hydro6: hydroN6,
  ratios: { ninoVsNeutral: ratioNino, ninaVsNeutral: ratioNina, wetVsDryM4: ratioHydro, wetVsDryM6: ratioHydro6 },
  pearson: {
    oni_n4: rOniN4.r, oni_n6: rOniN6.r, oni_energy: rOniE.r, soi_n4: rSoiN4.r, sun_n4: rSsN4.r,
  },
  lunarM6: { bins, labels: ['nueva', 'creciente', 'llena', 'menguante'], chi2: tideChi, n: nBig },
  lunarM7: { bins: bins7, n: big7.length },
}
writeFileSync(resolve(DATA, 'mechanism-correlation.json'), JSON.stringify(out, null, 2))
console.log('\nratios', out.ratios)
console.log('Wrote data/mechanism-correlation.json')
