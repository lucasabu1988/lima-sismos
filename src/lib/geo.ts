import type { Region, ZoneFilter } from '../types'

export const LIMA = {
  lat: -12.0464,
  lon: -77.0428,
  name: 'Lima',
}

/** Territorio peruano + fosa adyacente. */
export const PERU_BBOX = {
  minLat: -18.55,
  maxLat: 0.15,
  minLon: -81.55,
  maxLon: -68.55,
}

/** Recorte Lima / Callao / Cañete, con fosa. */
export const LIMA_BBOX = {
  minLat: -13.45,
  maxLat: -11.15,
  minLon: -79.6,
  maxLon: -76.15,
}

export const CITIES: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Tumbes', lat: -3.5669, lon: -80.4515 },
  { name: 'Piura', lat: -5.1945, lon: -80.6328 },
  { name: 'Chiclayo', lat: -6.7714, lon: -79.8409 },
  { name: 'Trujillo', lat: -8.1116, lon: -79.0288 },
  { name: 'Chimbote', lat: -9.0745, lon: -78.5936 },
  { name: 'Huaraz', lat: -9.5278, lon: -77.5278 },
  { name: 'Iquitos', lat: -3.7437, lon: -73.2516 },
  { name: 'Pucallpa', lat: -8.3791, lon: -74.5539 },
  { name: 'Huánuco', lat: -9.9306, lon: -76.2422 },
  { name: 'Lima', lat: -12.0464, lon: -77.0428 },
  { name: 'Huancayo', lat: -12.0651, lon: -75.2049 },
  { name: 'Ica', lat: -14.0678, lon: -75.7286 },
  { name: 'Ayacucho', lat: -13.1588, lon: -74.2232 },
  { name: 'Cusco', lat: -13.5319, lon: -71.9675 },
  { name: 'Arequipa', lat: -16.409, lon: -71.5375 },
  { name: 'Puno', lat: -15.8402, lon: -70.0219 },
  { name: 'Tacna', lat: -18.0066, lon: -70.2463 },
  { name: 'Puerto Maldonado', lat: -12.5933, lon: -69.1891 },
]

export const MAP_BOUNDS: Record<ZoneFilter, [[number, number], [number, number]]> = {
  peru: [
    [-18.45, -81.45],
    [-0.05, -68.65],
  ],
  norte: [
    [-8.7, -81.45],
    [-0.05, -70.2],
  ],
  centro: [
    [-13.55, -80.1],
    [-8.4, -72.4],
  ],
  sur: [
    [-18.45, -76.8],
    [-13.3, -68.65],
  ],
  oriente: [
    [-13.6, -76.2],
    [-0.4, -68.65],
  ],
  fosa: [
    [-18.45, -81.55],
    [-3.2, -70.4],
  ],
  lima: [
    [-13.4, -79.5],
    [-11.2, -76.05],
  ],
}

const COAST: Array<[number, number]> = [
  [-3.5, -80.45],
  [-4.6, -81.28],
  [-5.1, -81.12],
  [-6.0, -81.05],
  [-6.8, -79.95],
  [-8.1, -79.12],
  [-9.1, -78.62],
  [-10.1, -78.18],
  [-11.1, -77.62],
  [-11.77, -77.18],
  [-12.05, -77.16],
  [-12.52, -76.74],
  [-13.08, -76.4],
  [-13.72, -76.22],
  [-14.7, -75.9],
  [-15.4, -75.05],
  [-16.25, -73.7],
  [-16.65, -72.75],
  [-17.02, -72.02],
  [-17.7, -71.35],
  [-18.35, -70.38],
]

export const TRENCH_LINE: Array<[number, number]> = [
  [-3.7, -81.35],
  [-5.2, -81.55],
  [-6.8, -81.05],
  [-8.2, -80.25],
  [-9.5, -79.65],
  [-11.0, -79.05],
  [-12.05, -78.82],
  [-13.2, -77.85],
  [-14.5, -76.55],
  [-15.8, -75.15],
  [-16.8, -73.55],
  [-17.7, -72.15],
  [-18.4, -71.05],
]

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function coastLongitude(lat: number): number {
  if (lat >= COAST[0][0]) return COAST[0][1]
  const last = COAST[COAST.length - 1]
  if (lat <= last[0]) return last[1]
  for (let i = 0; i < COAST.length - 1; i++) {
    const [latA, lonA] = COAST[i]
    const [latB, lonB] = COAST[i + 1]
    if (lat <= latA && lat >= latB) {
      const t = (lat - latA) / (latB - latA)
      return lonA + t * (lonB - lonA)
    }
  }
  return -77.05
}

export function isOffshore(lat: number, lon: number): boolean {
  return lon < coastLongitude(lat) - 0.05
}

function isAmazon(lat: number, lon: number): boolean {
  if (isOffshore(lat, lon)) return false
  if (lat > -5.6 && lon > -76.8) return true
  if (lat > -9.8 && lon > -75.4) return true
  if (lat > -13.9 && lon > -71.15) return true
  return false
}

export function classifyRegion(lat: number, lon: number): Region {
  if (isAmazon(lat, lon)) return 'oriente'
  if (lat >= -8.5) return 'norte'
  if (lat >= -13.5) return 'centro'
  return 'sur'
}

export function inLimaFocus(lat: number, lon: number): boolean {
  return (
    lat >= LIMA_BBOX.minLat &&
    lat <= LIMA_BBOX.maxLat &&
    lon >= LIMA_BBOX.minLon &&
    lon <= LIMA_BBOX.maxLon
  )
}

export function nearestCity(lat: number, lon: number): { name: string; km: number } {
  let best = CITIES[0]
  let bestKm = Infinity
  for (const city of CITIES) {
    const km = haversineKm(lat, lon, city.lat, city.lon)
    if (km < bestKm) {
      best = city
      bestKm = km
    }
  }
  return { name: best.name, km: bestKm }
}

export const REGION_LABEL: Record<Region, string> = {
  norte: 'norte',
  centro: 'centro',
  sur: 'sur',
  oriente: 'oriente',
}

export const FILTER_LABEL: Record<ZoneFilter, string> = {
  peru: 'Todo el Perú',
  norte: 'Norte',
  centro: 'Centro',
  sur: 'Sur',
  oriente: 'Oriente',
  fosa: 'Fosa marítima',
  lima: 'Lima y Callao',
}
