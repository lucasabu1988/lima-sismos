import type { AlertInfo, Quake, Region, TimeWindow, ZoneFilter } from '../types'
import { windowMs } from './format'
import { inLimaFocus } from './geo'

export function seismicEnergy(mag: number): number {
  return 10 ** (1.5 * mag)
}

export function inZone(quake: Quake, filter: ZoneFilter): boolean {
  if (filter === 'peru') return true
  if (filter === 'fosa') return quake.offshore
  if (filter === 'lima') return inLimaFocus(quake.lat, quake.lon)
  return quake.region === filter
}

export function inWindow(quake: Quake, window: TimeWindow, now = Date.now()): boolean {
  return now - quake.time <= windowMs(window)
}

export function filterQuakes(
  quakes: Quake[],
  zone: ZoneFilter,
  window: TimeWindow,
  minMag: number,
  now = Date.now(),
): Quake[] {
  return quakes.filter(
    (q) => inZone(q, zone) && inWindow(q, window, now) && q.mag >= minMag,
  )
}

export function countByRegion(quakes: Quake[]): Record<Region | 'fosa', number> {
  const counts: Record<Region | 'fosa', number> = {
    norte: 0,
    centro: 0,
    sur: 0,
    oriente: 0,
    fosa: 0,
  }
  for (const q of quakes) {
    counts[q.region] += 1
    if (q.offshore) counts.fosa += 1
  }
  return counts
}

export function computeAlert(quakes: Quake[], now = Date.now()): AlertInfo {
  const day = 86_400_000
  const recent = quakes.filter((q) => now - q.time <= 2 * day)
  const big = recent.find((q) => q.mag >= 6.0)
  if (big) {
    const tsunami =
      big.offshore && big.depthKm < 60 && big.mag >= 6.5
        ? ' Evento superficial y mar adentro: consultar DHN y PTWC por eventual tsunami.'
        : ''
    return {
      level: 'alerta',
      title: `Sismo M ${big.mag.toFixed(1)} en territorio peruano`,
      detail: `${big.place}. Profundidad ${Math.round(big.depthKm)} km · ${big.nearestCity}.${tsunami} Esto no sustituye una alerta oficial.`,
    }
  }

  const strong = recent.find((q) => q.mag >= 5.5)
  const week = quakes.filter((q) => now - q.time <= 7 * day)
  const baseline = quakes.filter((q) => {
    const age = now - q.time
    return age > 7 * day && age <= 91 * day
  })
  const weekEnergy = week.reduce((s, q) => s + seismicEnergy(q.mag), 0)
  const weeklyAvg = baseline.reduce((s, q) => s + seismicEnergy(q.mag), 0) / 12 || 1
  const ratio = weekEnergy / weeklyAvg

  if (strong || ratio >= 3) {
    return {
      level: 'alta',
      title: strong
        ? `Actividad alta · M ${strong.mag.toFixed(1)} en 48 h`
        : 'Actividad alta en el territorio',
      detail: 'La energía sísmica de la última semana está claramente por encima del promedio de 90 días. Sigue los canales oficiales del IGP.',
    }
  }
  if (ratio >= 1.6) {
    return {
      level: 'elevada',
      title: 'Actividad elevada en el Perú',
      detail: 'Más energía de lo habitual en 7 días respecto al promedio de 90 días. Es variación normal del margen andino, no un pronóstico.',
    }
  }
  if (week.length === 0) {
    return {
      level: 'calma',
      title: 'Calma relativa en el territorio',
      detail: 'Sin eventos destacados en el Perú durante la última semana, según IGP y USGS.',
    }
  }
  return {
    level: 'normal',
    title: 'Actividad dentro de lo habitual',
    detail: 'El margen peruano es una zona de subducción activa. El ritmo de la última semana está cerca del promedio reciente.',
  }
}

export function wasFelt(q: Quake): boolean {
  if (q.intensity && q.intensity.trim().length > 0) return true
  return Boolean(q.felt && q.felt > 0)
}
