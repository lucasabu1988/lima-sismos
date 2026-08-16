import type { AlertInfo, TimeWindow, ZoneFilter } from '../types'
import { windowLabel } from '../lib/format'
import { ActivityLamp } from './AlertBanner'

interface Props {
  zone: ZoneFilter
  window: TimeWindow
  minMag: number
  activity: AlertInfo['level']
  onZone: (z: ZoneFilter) => void
  onWindow: (w: TimeWindow) => void
  onMinMag: (m: number) => void
}

const ZONES: Array<{ id: ZoneFilter; label: string; hint: string }> = [
  { id: 'peru', label: 'Todo el Perú', hint: 'territorio + fosa' },
  { id: 'norte', label: 'Norte', hint: 'Tumbes a La Libertad' },
  { id: 'centro', label: 'Centro', hint: 'Áncash a Ica' },
  { id: 'sur', label: 'Sur', hint: 'Arequipa a Tacna' },
  { id: 'oriente', label: 'Oriente', hint: 'selva amazónica' },
  { id: 'fosa', label: 'Fosa', hint: 'mar adentro' },
  { id: 'lima', label: 'Lima', hint: 'Callao y Cañete' },
]

const WINDOWS: TimeWindow[] = ['24h', '7d', '30d', '90d', 'ytd']
const MAGS = [2.5, 3, 3.5, 4, 4.5, 5]

export function Filters({ zone, window, minMag, activity, onZone, onWindow, onMinMag }: Props) {
  return (
    <div className="flex flex-col gap-2 border-b border-line py-2 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex snap-x gap-px overflow-x-auto border border-line">
        {ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            title={z.hint}
            onClick={() => onZone(z.id)}
            className={`h-9 shrink-0 snap-start px-3 text-[13px] ${
              zone === z.id ? 'bg-foam/10 text-foam' : 'text-sand/80 hover:bg-panel-2'
            }`}
          >
            {z.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onWindow(w)}
              className={`h-7 px-2 font-mono text-[11px] tracking-wide ${
                window === w ? 'bg-copper/10 text-copper' : 'text-muted hover:text-sand'
              }`}
            >
              {windowLabel(w)}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-muted">mín.</span>
        <div className="flex items-center">
          {MAGS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMinMag(m)}
              className={`h-7 px-2 font-mono text-[11px] ${
                minMag === m ? 'bg-sand text-ink' : 'text-muted hover:text-sand'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <ActivityLamp level={activity} />
      </div>
    </div>
  )
}
