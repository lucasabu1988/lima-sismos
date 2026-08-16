import { classifyRegion, haversineKm, isOffshore, LIMA, nearestCity, PERU_BBOX } from './geo'
import type { IgpLatest, Quake, Volcano, VolcanoBulletin } from '../types'

const IGP_BASE = '/igp-api/api'
const CENVUL_BASE = '/cenvul-api/backend/api'
const USGS_BASE = 'https://earthquake.usgs.gov/fdsnws/event/1/query'

interface IgpCatalogItem {
  codigo?: string
  fecha_local?: string
  hora_local?: string
  fecha_utc?: string
  hora_utc?: string
  latitud?: string | number
  longitud?: string | number
  magnitud?: string | number
  profundidad?: string | number
  referencia?: string
  intensidad?: string
}

interface IgpLatestRaw {
  codigo?: string
  fecha_hora?: string
  latitud?: string | number
  longitud?: string | number
  magnitud?: string | number
  profundidad?: string | number
  referencia?: string
  intensidades?: string
  mapa_sismico_url?: string
}

function num(value: string | number | undefined): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''))
  return Number.isFinite(n) ? n : NaN
}

function combineIgpStamp(dateIso?: string, timeIso?: string): number {
  if (!dateIso || !timeIso) return NaN
  const date = dateIso.slice(0, 10)
  const timeMatch = timeIso.match(/T(\d{2}:\d{2}:\d{2})/)
  const time = timeMatch?.[1] ?? '00:00:00'
  const utc = Date.parse(`${date}T${time}Z`)
  return Number.isFinite(utc) ? utc : NaN
}

function toQuake(
  id: string,
  source: Quake['source'],
  time: number,
  lat: number,
  lon: number,
  mag: number,
  depthKm: number,
  place: string,
  extra: Partial<Quake> = {},
): Quake | null {
  if (![time, lat, lon, mag].every(Number.isFinite)) return null
  const city = nearestCity(lat, lon)
  return {
    id,
    source,
    time,
    lat,
    lon,
    mag,
    depthKm: Number.isFinite(depthKm) ? depthKm : 0,
    place: place || 'Sin referencia',
    region: classifyRegion(lat, lon),
    kmToLima: haversineKm(lat, lon, LIMA.lat, LIMA.lon),
    nearestCity: city.name,
    kmToCity: city.km,
    offshore: isOffshore(lat, lon),
    ...extra,
  }
}

function parseIgpLocalStamp(iso?: string): number {
  if (!iso) return NaN
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/)
  if (!match) return Date.parse(iso)
  return Date.parse(`${match[1]}T${match[2]}-05:00`)
}

export function parseIgpLatest(raw: IgpLatestRaw): IgpLatest | null {
  // CENSIS envía fecha_hora en hora de Lima, a veces con sufijo Z incorrecto.
  const time = parseIgpLocalStamp(raw.fecha_hora)
  const lat = num(raw.latitud)
  const lon = num(raw.longitud)
  const mag = num(raw.magnitud)
  if (![time, lat, lon, mag].every(Number.isFinite)) return null
  return {
    codigo: raw.codigo ?? 'igp-ultimo',
    time,
    lat,
    lon,
    mag,
    depthKm: num(raw.profundidad),
    place: raw.referencia ?? 'Perú',
    intensity: raw.intensidades,
    mapUrl: raw.mapa_sismico_url,
  }
}

export function igpLatestToQuake(latest: IgpLatest): Quake | null {
  return toQuake(
    `igp-${latest.codigo}`,
    'IGP',
    latest.time,
    latest.lat,
    latest.lon,
    latest.mag,
    latest.depthKm,
    latest.place,
    { intensity: latest.intensity, url: latest.mapUrl },
  )
}

function parseIgpItem(item: IgpCatalogItem): Quake | null {
  const time =
    combineIgpStamp(item.fecha_utc, item.hora_utc) ||
    combineIgpStamp(item.fecha_local, item.hora_local)
  return toQuake(
    `igp-${item.codigo ?? `${item.latitud}-${item.hora_utc}`}`,
    'IGP',
    time,
    num(item.latitud),
    num(item.longitud),
    num(item.magnitud),
    num(item.profundidad),
    item.referencia ?? '',
    { intensity: item.intensidad },
  )
}

interface UsgsFeature {
  id?: string
  properties?: {
    mag?: number
    place?: string
    time?: number
    url?: string
    tsunami?: number
    felt?: number | null
    type?: string
  }
  geometry?: { coordinates?: number[] }
}

export function parseUsgs(collection: { features?: UsgsFeature[] }): Quake[] {
  const out: Quake[] = []
  for (const f of collection.features ?? []) {
    if (f.properties?.type && f.properties.type !== 'earthquake') continue
    const [lon, lat, depth] = f.geometry?.coordinates ?? []
    const q = toQuake(
      `usgs-${f.id ?? `${lat}-${f.properties?.time}`}`,
      'USGS',
      f.properties?.time ?? NaN,
      lat,
      lon,
      f.properties?.mag ?? NaN,
      depth,
      f.properties?.place ?? '',
      {
        url: f.properties?.url,
        tsunamiFlag: f.properties?.tsunami === 1,
        felt: f.properties?.felt ?? null,
      },
    )
    if (q) out.push(q)
  }
  return out
}

export async function fetchIgpLatest(signal?: AbortSignal): Promise<IgpLatest> {
  const res = await fetch(`${IGP_BASE}/ultimo-sismo`, { signal })
  if (!res.ok) throw new Error(`IGP último sismo (${res.status})`)
  const parsed = parseIgpLatest(await res.json())
  if (!parsed) throw new Error('IGP último sismo: respuesta inválida')
  return parsed
}

export async function fetchIgpCatalog(
  year = new Date().getFullYear(),
  signal?: AbortSignal,
): Promise<Quake[]> {
  const res = await fetch(`${IGP_BASE}/ultimo-sismo/ajaxb/${year}`, { signal })
  if (!res.ok) throw new Error(`IGP catálogo (${res.status})`)
  const raw = (await res.json()) as IgpCatalogItem[]
  if (!Array.isArray(raw)) throw new Error('IGP catálogo: formato inesperado')
  return raw.map(parseIgpItem).filter((q): q is Quake => q !== null)
}

export async function fetchIgpStats(signal?: AbortSignal): Promise<{
  total: number
  monthly: number[]
  year: string
}> {
  const res = await fetch(`${IGP_BASE}/ultimo-sismo/inicio`, { signal })
  if (!res.ok) throw new Error(`IGP estadísticas (${res.status})`)
  const data = (await res.json()) as {
    numSismosTotal?: number
    numSismosPorMes?: number[]
    anho?: string
  }
  return {
    total: Number(data.numSismosTotal) || 0,
    monthly: Array.isArray(data.numSismosPorMes) ? data.numSismosPorMes : [],
    year: data.anho ?? String(new Date().getFullYear()),
  }
}

export async function fetchUsgs(signal?: AbortSignal): Promise<Quake[]> {
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - 120)
  const params = new URLSearchParams({
    format: 'geojson',
    minlatitude: String(PERU_BBOX.minLat),
    maxlatitude: String(PERU_BBOX.maxLat),
    minlongitude: String(PERU_BBOX.minLon),
    maxlongitude: String(PERU_BBOX.maxLon),
    minmagnitude: '2.5',
    orderby: 'time',
    starttime: start.toISOString().slice(0, 10),
    limit: '2000',
  })
  const res = await fetch(`${USGS_BASE}?${params}`, { signal })
  if (!res.ok) throw new Error(`USGS (${res.status})`)
  return parseUsgs(await res.json())
}

function stripHtml(html?: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseSeismicCount(text: string): number | null {
  const match = text.match(/(\d+)\s+sismos?/i)
  return match ? Number(match[1]) : null
}

interface CenvulVolcanoRaw {
  id?: number
  name?: string
  slug?: string
  region?: string
  latitud?: number
  longitud?: number
  elevation?: string | number
  last_eruption?: string | null
  risk?: string | null
  seismogram?: string | null
  camera?: Array<{ title?: string; link?: string; status?: boolean }>
}

export function parseCenvulVolcanoes(payload: { data?: CenvulVolcanoRaw[] } | CenvulVolcanoRaw[]): Volcano[] {
  const rows = Array.isArray(payload) ? payload : (payload.data ?? [])
  const out: Volcano[] = []
  for (const v of rows) {
    const lat = Number(v.latitud)
    const lon = Number(v.longitud)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !v.name) continue
    const elev = Number.parseFloat(String(v.elevation ?? ''))
    out.push({
      id: v.id ?? 0,
      name: v.name,
      slug: v.slug ?? String(v.id ?? v.name),
      region: v.region ?? '',
      lat,
      lon,
      elevationM: Number.isFinite(elev) ? elev : null,
      lastEruption: v.last_eruption ?? undefined,
      risk: v.risk ?? undefined,
      seismogram: toIdeProxy(v.seismogram),
      cameras: (v.camera ?? [])
        .filter((c) => c.status !== false && c.link)
        .map((c) => ({ title: c.title ?? 'Cámara', url: toIdeProxy(c.link) ?? c.link! })),
    })
  }
  return out
}

interface CenvulBulletinRaw {
  date?: string
  code?: string
  report?: string
  analysisPeriod?: string
  summary?: string
  analysis?: string
  file?: { url?: string }
  semaphore?: { color?: string; description?: string }
  volcano?: { id?: number; name?: string }
}

export function parseCenvulBulletin(raw: CenvulBulletinRaw): VolcanoBulletin | null {
  if (!raw.volcano?.name) return null
  const analysis = stripHtml(raw.analysis)
  const summary = stripHtml(raw.summary)
  return {
    volcanoId: raw.volcano.id ?? 0,
    volcanoName: raw.volcano.name,
    code: raw.code ?? '',
    report: raw.report ?? raw.code ?? 'CENVUL',
    time: Date.parse(raw.date ?? '') || Date.now(),
    period: raw.analysisPeriod ?? '',
    summary,
    analysis,
    semaphore: raw.semaphore?.color ?? 'Sin dato',
    semaphoreDetail: raw.semaphore?.description,
    seismicCount: parseSeismicCount(analysis) ?? parseSeismicCount(summary),
    pdfUrl: raw.file?.url ? `https://cenvul.igp.gob.pe${raw.file.url}` : undefined,
  }
}

function toIdeProxy(url?: string | null): string | undefined {
  if (!url) return undefined
  return url.replace(/^https?:\/\/ide\.igp\.gob\.pe/i, '/ide-api')
}

export async function fetchCenvulVolcanoes(signal?: AbortSignal): Promise<Volcano[]> {
  const res = await fetch(`${CENVUL_BASE}/volcanoes?populate=*`, { signal })
  if (!res.ok) throw new Error(`CENVUL volcanes (${res.status})`)
  return parseCenvulVolcanoes(await res.json())
}

export async function fetchImageStamp(url: string, signal?: AbortSignal): Promise<number | null> {
  const res = await fetch(url, { method: 'HEAD', cache: 'no-store', signal })
  if (!res.ok) return null
  const raw = res.headers.get('Last-Modified')
  const ts = raw ? Date.parse(raw) : NaN
  return Number.isFinite(ts) ? ts : null
}

export async function fetchCenvulLatest(signal?: AbortSignal): Promise<VolcanoBulletin> {
  const res = await fetch(`${CENVUL_BASE}/latest-information`, { signal })
  if (!res.ok) throw new Error(`CENVUL boletín (${res.status})`)
  const parsed = parseCenvulBulletin(await res.json())
  if (!parsed) throw new Error('CENVUL boletín: respuesta inválida')
  return parsed
}

/** Prefer IGP when both agencies report the same event (~50 km, 20 min, 0.6 mag). */
export function mergeCatalogs(igp: Quake[], usgs: Quake[]): Quake[] {
  const merged = [...igp]
  for (const u of usgs) {
    const dup = igp.some(
      (i) =>
        Math.abs(i.time - u.time) < 20 * 60 * 1000 &&
        Math.abs(i.mag - u.mag) < 0.7 &&
        haversineKm(i.lat, i.lon, u.lat, u.lon) < 55,
    )
    if (!dup) merged.push(u)
  }
  return merged.sort((a, b) => b.time - a.time)
}
