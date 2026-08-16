import type { IgpLatest, Quake, Region } from '../types'
import { formatKm, formatMag, formatRelative, magColor } from '../lib/format'
import { countByRegion, wasFelt, seismicEnergy } from '../lib/activity'

interface Props {
  latestInView: Quake | null
  igpLatest: IgpLatest | null
  events: Quake[]
  yearTotal: number | null
}

const REGION_CHIP: Array<{ id: Region | 'fosa'; label: string }> = [
  { id: 'norte', label: 'N' },
  { id: 'centro', label: 'C' },
  { id: 'sur', label: 'S' },
  { id: 'oriente', label: 'O' },
  { id: 'fosa', label: 'F' },
]

export function KpiStrip({ latestInView, igpLatest, events, yearTotal }: Props) {
  const max = events.reduce<Quake | null>((acc, q) => (!acc || q.mag > acc.mag ? q : acc), null)
  const closest = [...events].sort((a, b) => a.kmToCity - b.kmToCity)[0]
  const energy = events.reduce((s, q) => s + seismicEnergy(q.mag), 0)
  const energyRef = seismicEnergy(4.5)
  const energyLabel = energy === 0 ? '—' : `${(energy / energyRef).toFixed(1)}×`
  const felt = events.filter(wasFelt).length
  const regions = countByRegion(events)

  return (
    <div className="console grid-cols-2 xl:grid-cols-12">
      <Hero
        className="col-span-2 xl:col-span-4"
        kicker="En esta vista"
        mag={latestInView?.mag}
        place={latestInView?.place ?? 'Sin eventos en el filtro'}
        meta={
          latestInView
            ? `${formatRelative(latestInView.time)} · ${formatKm(latestInView.kmToCity)} de ${latestInView.nearestCity} · ${latestInView.source}`
            : 'Amplía la ventana o la zona'
        }
      />
      <Hero
        className="col-span-2 xl:col-span-4"
        kicker="Último oficial IGP"
        mag={igpLatest?.mag}
        place={igpLatest?.place ?? 'Esperando CENSIS'}
        meta={
          igpLatest
            ? `${formatRelative(igpLatest.time)} · ${Math.round(igpLatest.depthKm)} km de profundidad`
            : 'Fuente IGP / CENSIS'
        }
      />
      <div className="col-span-2 grid grid-cols-2 xl:col-span-4 [&>*]:border-r [&>*]:border-b [&>*]:border-line-soft [&>*:nth-child(even)]:border-r-0">
        <Micro
          label="Máxima"
          value={max ? formatMag(max.mag) : '—'}
          hint={max ? max.place : 'sin datos'}
          accent={max ? magColor(max.mag) : undefined}
        />
        <Micro
          label="Más próximo"
          value={closest ? formatKm(closest.kmToCity) : '—'}
          hint={closest ? `${closest.nearestCity} · M ${formatMag(closest.mag)}` : 'sin datos'}
        />
        <Micro
          label="Energía · M4.5"
          value={energyLabel}
          hint={felt ? `${felt} con intensidad` : `${events.length} eventos`}
          accent="#e8a45a"
        />
        <article className="px-4 py-3">
          <p className="overline">Región {yearTotal != null ? `· ${yearTotal}` : ''}</p>
          <div className="mt-2 flex justify-between gap-1">
            {REGION_CHIP.map((r) => (
              <div key={r.id} className="text-center">
                <p className="font-mono text-[18px] leading-5 text-sand">{regions[r.id]}</p>
                <p className="font-mono text-[10px] text-muted">{r.label}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}

function Hero({
  className,
  kicker,
  mag,
  place,
  meta,
}: {
  className?: string
  kicker: string
  mag?: number
  place: string
  meta: string
}) {
  return (
    <article className={`px-4 py-3 ${className ?? ''}`}>
      <p className="overline">{kicker}</p>
      <div className="mt-1 flex items-end gap-2">
        <span
          className="font-mono text-[40px] font-medium leading-[38px] tracking-[-0.02em] xl:text-[52px] xl:leading-[48px]"
          style={{ color: mag == null ? '#8aa39a' : magColor(mag) }}
        >
          {mag == null ? '—' : formatMag(mag)}
        </span>
        <span className="overline pb-1">Mw / M</span>
      </div>
      <p className="mt-2 truncate text-[14px] leading-[22px] text-sand">{place}</p>
      <p className="truncate font-mono text-[11px] text-muted">{meta}</p>
    </article>
  )
}

function Micro({
  className,
  label,
  value,
  hint,
  accent,
}: {
  className?: string
  label: string
  value: string
  hint: string
  accent?: string
}) {
  return (
    <article className={`px-4 py-3 ${className ?? ''}`}>
      <p className="overline">{label}</p>
      <p className="mt-1 font-mono text-[28px] leading-7 tracking-[-0.01em]" style={{ color: accent ?? '#e8dcc6' }}>
        {value}
      </p>
      <p className="mt-1 truncate text-[12px] text-muted">{hint}</p>
    </article>
  )
}
