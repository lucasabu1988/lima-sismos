import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Quake, TsunamiBulletin, Volcano, ZoneFilter } from '../types'
import { CITIES, MAP_BOUNDS, TRENCH_LINE } from '../lib/geo'
import gnss from '../data/gnss-series.json'
import { formatKm, formatLimaDateTime, formatMag, magColor } from '../lib/format'

interface Props {
  quakes: Quake[]
  volcanoes: Volcano[]
  tsunamiBulletins: TsunamiBulletin[]
  activeVolcanoId: number | null
  zone: ZoneFilter
  selectedId: string | null
  onSelect: (id: string) => void
  onSelectVolcano: (id: number) => void
}

function volcanoIcon(color: string, active: boolean) {
  const size = active ? 16 : 12
  return L.divIcon({
    className: 'volcano-marker',
    html: `<div style="width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${size}px solid ${color}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  })
}

export function QuakeMap({
  quakes,
  volcanoes,
  tsunamiBulletins,
  activeVolcanoId,
  zone,
  selectedId,
  onSelect,
  onSelectVolcano,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const volcanoLayerRef = useRef<L.LayerGroup | null>(null)
  const tsunamiLayerRef = useRef<L.LayerGroup | null>(null)
  const onSelectRef = useRef(onSelect)
  const onSelectVolcanoRef = useRef(onSelectVolcano)
  onSelectRef.current = onSelect
  onSelectVolcanoRef.current = onSelectVolcano

  useEffect(() => {
    if (!hostRef.current || mapRef.current) return
    const map = L.map(hostRef.current, {
      zoomControl: false,
      attributionControl: true,
      minZoom: 5,
      maxZoom: 12,
    }).fitBounds(MAP_BOUNDS.peru, { padding: [24, 24] })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO',
      subdomains: 'abcd',
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.polyline(
      TRENCH_LINE.map(([lat, lon]) => [lat, lon] as L.LatLngExpression),
      { color: '#6ec3d8', weight: 1.5, dashArray: '6 8', opacity: 0.7 },
    ).addTo(map).bindTooltip('Fosa Perú-Chile (aprox.)', { className: 'quake-tooltip' })

    for (const s of gnss.stations) {
      L.circleMarker([s.lat, s.lon], {
        radius: 4,
        color: '#6ec3d8',
        fillColor: '#0b1210',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map).bindTooltip(
        `GNSS ${s.id} · ${s.name}<br/>${s.ve != null ? `${s.ve.toFixed(1)} mm/a E · ${s.vn?.toFixed(1)} mm/a N` : ''}`,
        { className: 'quake-tooltip' },
      )
    }

    for (const city of CITIES) {
      L.circleMarker([city.lat, city.lon], {
        radius: 3,
        color: '#e8dcc6',
        fillColor: '#e8dcc6',
        fillOpacity: 0.9,
        weight: 1,
      }).addTo(map).bindTooltip(city.name, { className: 'quake-tooltip', permanent: false })
    }

    mapRef.current = map
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.flyToBounds(MAP_BOUNDS[zone], { padding: [28, 28], duration: 0.7 })
  }, [zone])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    layerRef.current?.remove()
    const group = L.layerGroup()
    const national = zone === 'peru'
    const sorted = [...quakes].sort((a, b) => a.mag - b.mag)

    for (const q of sorted) {
      const selected = q.id === selectedId
      const scale = national ? 1.45 : 1.7
      const tsunami = Boolean(q.tsunamiFlag)
      const marker = L.circleMarker([q.lat, q.lon], {
        radius: selected ? 6 + q.mag * (scale + 0.3) : 3.2 + q.mag * scale,
        color: selected ? '#e8dcc6' : tsunami ? '#6ec3d8' : magColor(q.mag),
        weight: selected || tsunami ? 2 : 1,
        dashArray: tsunami && !selected ? '3 3' : undefined,
        fillColor: magColor(q.mag),
        fillOpacity: selected ? 0.9 : 0.55,
      })
      marker.bindTooltip(
        `<strong>M ${formatMag(q.mag)}</strong> · ${q.source}${q.tsunamiFlag ? ' · aviso tsunami USGS' : ''}<br/>${q.place}<br/>${formatLimaDateTime(q.time)}<br/>${formatKm(q.kmToCity)} de ${q.nearestCity} · ${Math.round(q.depthKm)} km`,
        { className: 'quake-tooltip', sticky: true },
      )
      marker.on('click', () => onSelectRef.current(q.id))
      marker.addTo(group)
    }

    group.addTo(map)
    layerRef.current = group
  }, [quakes, selectedId, zone])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    volcanoLayerRef.current?.remove()
    const group = L.layerGroup()
    for (const v of volcanoes) {
      const active = v.id === activeVolcanoId
      const marker = L.marker([v.lat, v.lon], {
        icon: volcanoIcon(active ? '#e8dcc6' : '#e8a45a', active),
        zIndexOffset: 400,
      })
      marker.bindTooltip(
        `<strong>Volcán ${v.name}</strong><br/>${v.region}${v.elevationM ? ` · ${Math.round(v.elevationM)} m` : ''}<br/>${v.lastEruption ? `última erupción: ${v.lastEruption}` : 'vigilado por CENVUL'}`,
        { className: 'quake-tooltip', sticky: true },
      )
      marker.on('click', () => onSelectVolcanoRef.current(v.id))
      marker.addTo(group)
    }
    group.addTo(map)
    volcanoLayerRef.current = group
  }, [volcanoes, activeVolcanoId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    tsunamiLayerRef.current?.remove()
    const group = L.layerGroup()
    for (const b of tsunamiBulletins) {
      if (b.lat == null || b.lon == null) continue
      L.circleMarker([b.lat, b.lon], {
        radius: 10,
        color: b.relevantToPeru ? '#7dffc3' : '#6ec3d8',
        weight: 2,
        fillColor: '#0b1210',
        fillOpacity: 0.35,
        dashArray: '4 3',
      })
        .bindTooltip(
          `<strong>PTWC ${b.category || 'boletín'}</strong><br/>${b.title}<br/>${b.region}${b.mag != null ? ` · M ${b.mag.toFixed(1)}` : ''}`,
          { className: 'quake-tooltip', sticky: true },
        )
        .addTo(group)
    }
    group.addTo(map)
    tsunamiLayerRef.current = group
  }, [tsunamiBulletins])

  return (
    <div className="panel relative overflow-hidden">
      <div ref={hostRef} className="h-[min(52vh,480px)] w-full lg:h-[max(520px,calc(100dvh-360px))]" />
      <div className="pointer-events-none absolute left-3 top-3 border border-line bg-ink/80 px-2.5 py-2 text-sand">
        <p className="overline">Mapa nacional</p>
        <p className="mt-1 text-[12px] text-sand-dim">Círculo magnitud · triángulo volcán · anillo PTWC · cuadrado GNSS</p>
      </div>
      <div className="absolute bottom-10 left-3 flex flex-wrap items-center gap-3 border border-line bg-ink/80 px-2.5 py-1.5 font-mono text-[10px]">
        {[
          [3, 'M3'],
          [4.5, 'M4.5'],
          [5.5, 'M5.5'],
          [6.5, 'M6.5+'],
        ].map(([m, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5" style={{ color: magColor(Number(m)) }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: magColor(Number(m)) }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
