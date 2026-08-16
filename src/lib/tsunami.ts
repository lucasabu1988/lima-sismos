import type { Quake, TsunamiBulletin, TsunamiLevel, TsunamiStatus } from '../types'

const PTWC_ATOM = '/ptwc-api/events/xml/PHEBAtom.xml'

const PERU_HINT =
  /\bperu|perú|chile|ecuador|south america|south american|sudamerica|sudam[eé]rica|arica|iquique|callao|nazca|pisco|arequipa|tacna|moquegua|chimbote|trujillo|piura\b/i

const BASIN_HINT = /\bpacific[- ]wide|teletsunami|south america|pacific basin|pacific ocean\b/i

function textOf(parent: Element, local: string): string {
  const nodes = parent.getElementsByTagName('*')
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].localName === local) return (nodes[i].textContent ?? '').trim()
  }
  return ''
}

function firstLink(entry: Element, title?: string): string | undefined {
  const links = entry.getElementsByTagName('link')
  for (let i = 0; i < links.length; i++) {
    const rel = links[i].getAttribute('title') ?? links[i].getAttribute('rel') ?? ''
    if (title && rel.toLowerCase().includes(title.toLowerCase())) {
      return links[i].getAttribute('href') ?? undefined
    }
  }
  const alt = entry.querySelector('link[rel="alternate"]')
  return alt?.getAttribute('href') ?? links[0]?.getAttribute('href') ?? undefined
}

function parseCategory(summaryHtml: string): string {
  const match = summaryHtml.match(/Category:<\/strong>\s*([^<]+)/i)
  return (match?.[1] ?? '').trim()
}

function parseRegion(summaryHtml: string): string {
  const match = summaryHtml.match(/Affected Region:<\/strong>\s*([^<]+)/i)
  return (match?.[1] ?? '').trim()
}

function parseMag(summaryHtml: string): number | null {
  const match = summaryHtml.match(/Preliminary Magnitude:<\/strong>\s*([0-9.]+)/i)
  const n = match ? Number(match[1]) : NaN
  return Number.isFinite(n) ? n : null
}

export function isRelevantToPeru(bulletin: Pick<TsunamiBulletin, 'title' | 'category' | 'region' | 'lat' | 'lon'>): boolean {
  const blob = `${bulletin.title} ${bulletin.region} ${bulletin.category}`
  if (PERU_HINT.test(blob)) return true
  const cat = bulletin.category.toLowerCase()
  const threat = /warning|watch|advisory/.test(cat)
  if (threat && BASIN_HINT.test(blob)) return true
  if (bulletin.lat == null || bulletin.lon == null) return threat && BASIN_HINT.test(blob)
  const { lat, lon } = bulletin
  if (lat >= -20 && lat <= 2 && lon >= -86 && lon <= -68) return true
  if (threat && lat > -45 && lat < 8 && lon > -100 && lon < -68) return true
  return false
}

export function parsePtwcAtom(xml: string): TsunamiBulletin[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('PTWC: XML inválido')
  const entries = [...doc.getElementsByTagName('entry')]
  return entries.map((entry) => {
    const summary = textOf(entry, 'summary')
    const latRaw = textOf(entry, 'lat')
    const lonRaw = textOf(entry, 'long') || textOf(entry, 'lon')
    const lat = Number.parseFloat(latRaw)
    const lon = Number.parseFloat(lonRaw)
    const draft = {
      title: textOf(entry, 'title') || 'Boletín PTWC',
      category: parseCategory(summary) || inferCategory(textOf(entry, 'title')),
      region: parseRegion(summary) || textOf(entry, 'title'),
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
    }
    const time = Date.parse(textOf(entry, 'updated')) || Date.now()
    return {
      id: textOf(entry, 'id') || `${draft.title}-${time}`,
      ...draft,
      time,
      mag: parseMag(summary),
      url: firstLink(entry, 'bulletin') ?? firstLink(entry),
      relevantToPeru: isRelevantToPeru(draft),
    }
  })
}

function inferCategory(title: string): string {
  const t = title.toUpperCase()
  if (t.includes('WARNING')) return 'Warning'
  if (t.includes('WATCH')) return 'Watch'
  if (t.includes('ADVISORY')) return 'Advisory'
  if (t.includes('CANCELL')) return 'Cancellation'
  return 'Information'
}

export function localTsunamiThreats(quakes: Quake[], now = Date.now()): Quake[] {
  const day = 86_400_000
  return quakes.filter(
    (q) =>
      now - q.time <= day &&
      q.offshore &&
      q.mag >= 6.5 &&
      q.depthKm < 70,
  )
}

function rank(category: string): TsunamiLevel | null {
  const c = category.toLowerCase()
  if (c.includes('warning')) return 'warning'
  if (c.includes('watch')) return 'watch'
  if (c.includes('advisory')) return 'advisory'
  if (c.includes('information') || c.includes('cancell')) return 'information'
  return null
}

export function evaluateTsunami(bulletins: TsunamiBulletin[], quakes: Quake[], now = Date.now()): TsunamiStatus {
  const fresh = bulletins.filter((b) => now - b.time <= 2 * 86_400_000)
  const relevant = fresh.filter((b) => b.relevantToPeru)
  const local = localTsunamiThreats(quakes, now)

  const threatOrder: TsunamiLevel[] = ['warning', 'watch', 'advisory']
  let official: TsunamiLevel | null = null
  let officialBulletin: TsunamiBulletin | undefined
  for (const level of threatOrder) {
    officialBulletin = relevant.find((b) => rank(b.category) === level)
    if (officialBulletin) {
      official = level
      break
    }
  }

  if (official && officialBulletin) {
    return {
      level: official,
      title: official === 'warning'
        ? 'Alerta de tsunami PTWC'
        : official === 'watch'
          ? 'Vigilancia de tsunami PTWC'
          : 'Aviso de tsunami PTWC',
      detail: `${officialBulletin.title}. ${officialBulletin.region}. Esto es un producto del Pacific Tsunami Warning Center. En Perú confirma con la DHN.`,
      bulletins: fresh,
      localThreats: local,
    }
  }

  if (local.length > 0) {
    const q = local[0]
    return {
      level: 'potential',
      title: `Potencial de tsunami local · M ${q.mag.toFixed(1)}`,
      detail: `${q.place}. Sismo superficial mar adentro. No hay boletín PTWC de amenaza para el Perú, pero hay que consultar DHN y tsunami.gov.`,
      bulletins: fresh,
      localThreats: local,
    }
  }

  const info = relevant.find((b) => rank(b.category) === 'information')
  if (info) {
    return {
      level: 'information',
      title: 'PTWC: sin amenaza destructiva para el Perú',
      detail: `Último boletín: ${info.title}. El centro evaluó el evento y no emitió warning/watch/advisory para esta costa.`,
      bulletins: fresh,
      localThreats: local,
    }
  }

  return {
    level: 'clear',
    title: 'Sin alerta de tsunami para el Perú',
    detail: fresh[0]
      ? `PTWC activo en el Pacífico (${fresh[0].title}), sin amenaza reportada para la costa peruana. Autoridad nacional: DHN.`
      : 'No hay boletines PTWC vigentes. La autoridad nacional de tsunami es la Dirección de Hidrografía y Navegación (DHN).',
    bulletins: fresh,
    localThreats: local,
  }
}

export async function fetchPtwc(signal?: AbortSignal): Promise<TsunamiBulletin[]> {
  const res = await fetch(PTWC_ATOM, { signal })
  if (!res.ok) throw new Error(`PTWC (${res.status})`)
  return parsePtwcAtom(await res.text())
}
