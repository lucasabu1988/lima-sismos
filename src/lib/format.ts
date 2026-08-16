const LIMA_TZ = 'America/Lima'

export function formatLimaDateTime(ts: number): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: LIMA_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

export function formatLimaClock(ts: number): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: LIMA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

export function formatRelative(ts: number, now = Date.now()): string {
  const delta = Math.max(0, now - ts)
  const min = Math.floor(delta / 60000)
  if (min < 1) return 'hace segundos'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  return `hace ${d} días`
}

export function formatMag(mag: number): string {
  return mag.toFixed(1)
}

export function formatKm(km: number): string {
  if (!Number.isFinite(km)) return '—'
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function magColor(mag: number): string {
  if (mag >= 6.5) return '#c44b32'
  if (mag >= 5.5) return '#e8a45a'
  if (mag >= 4.5) return '#d7b36a'
  if (mag >= 3.5) return '#6ec3d8'
  return '#7dffc3'
}

export function magGlow(mag: number): string {
  if (mag >= 5.5) return 'rgba(196, 75, 50, 0.35)'
  if (mag >= 4.5) return 'rgba(215, 179, 106, 0.28)'
  return 'rgba(125, 255, 195, 0.18)'
}

export function windowMs(key: '24h' | '7d' | '30d' | '90d' | 'ytd'): number {
  const day = 86_400_000
  if (key === '24h') return day
  if (key === '7d') return 7 * day
  if (key === '30d') return 30 * day
  if (key === '90d') return 90 * day
  const now = new Date()
  const start = Date.UTC(now.getUTCFullYear(), 0, 1)
  return Date.now() - start
}

export function windowLabel(key: '24h' | '7d' | '30d' | '90d' | 'ytd'): string {
  return {
    '24h': '24 horas',
    '7d': '7 días',
    '30d': '30 días',
    '90d': '90 días',
    ytd: `año ${new Date().getFullYear()}`,
  }[key]
}
