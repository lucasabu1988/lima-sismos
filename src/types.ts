export type QuakeSource = 'IGP' | 'USGS'

export type Region = 'norte' | 'centro' | 'sur' | 'oriente'

export type TimeWindow = '24h' | '7d' | '30d' | '90d' | 'ytd'

export type ZoneFilter = 'peru' | 'norte' | 'centro' | 'sur' | 'oriente' | 'fosa' | 'lima'

export interface Quake {
  id: string
  source: QuakeSource
  time: number
  lat: number
  lon: number
  mag: number
  depthKm: number
  place: string
  intensity?: string
  url?: string
  tsunamiFlag?: boolean
  felt?: number | null
  region: Region
  kmToLima: number
  nearestCity: string
  kmToCity: number
  offshore: boolean
}

export interface IgpLatest {
  codigo: string
  time: number
  lat: number
  lon: number
  mag: number
  depthKm: number
  place: string
  intensity?: string
  mapUrl?: string
}

export interface Volcano {
  id: number
  name: string
  slug: string
  region: string
  lat: number
  lon: number
  elevationM: number | null
  lastEruption?: string
  risk?: string
  seismogram?: string
  cameras: VolcanoCamera[]
}

export interface VolcanoCamera {
  title: string
  url: string
}

export interface VolcanoBulletin {
  volcanoId: number
  volcanoName: string
  code: string
  report: string
  time: number
  period: string
  summary: string
  analysis: string
  semaphore: string
  semaphoreDetail?: string
  seismicCount: number | null
  pdfUrl?: string
}

export type TsunamiLevel = 'clear' | 'information' | 'potential' | 'advisory' | 'watch' | 'warning'

export interface TsunamiBulletin {
  id: string
  title: string
  category: string
  region: string
  time: number
  mag: number | null
  lat: number | null
  lon: number | null
  url?: string
  relevantToPeru: boolean
}

export interface TsunamiStatus {
  level: TsunamiLevel
  title: string
  detail: string
  bulletins: TsunamiBulletin[]
  localThreats: Quake[]
}

export interface FeedState {
  quakes: Quake[]
  igpLatest: IgpLatest | null
  igpYearTotal: number | null
  igpMonthly: number[]
  volcanoes: Volcano[]
  volcanoBulletin: VolcanoBulletin | null
  tsunami: TsunamiStatus | null
  lastUpdated: number | null
  loading: boolean
  error: string | null
  sourcesOk: { igp: boolean; usgs: boolean; cenvul: boolean; ptwc: boolean }
}

export interface AlertInfo {
  level: 'calma' | 'normal' | 'elevada' | 'alta' | 'alerta'
  title: string
  detail: string
}
