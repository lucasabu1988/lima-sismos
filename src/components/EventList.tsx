import type { Quake } from '../types'
import { formatKm, formatLimaDateTime, formatMag, formatRelative, magColor } from '../lib/format'
import { REGION_LABEL } from '../lib/geo'

interface Props {
  quakes: Quake[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function EventList({ quakes, selectedId, onSelect }: Props) {
  return (
    <div className="panel flex h-[min(52vh,480px)] flex-col overflow-hidden lg:h-[max(520px,calc(100dvh-360px))]">
      <div className="flex h-12 items-center justify-between border-b border-line px-4">
        <p className="overline">Catálogo · {quakes.length} eventos</p>
        <p className="font-mono text-[11px] text-muted">hora de Lima</p>
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto">
        {quakes.length === 0 ? (
          <p className="px-4 py-10 text-center text-[14px] text-muted">No hay sismos con estos filtros.</p>
        ) : (
          <ul>
            {quakes.map((q) => {
              const active = q.id === selectedId
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(q.id)}
                    className={`flex min-h-[58px] w-full items-start gap-3 border-b border-line px-4 py-2.5 text-left ${
                      active ? 'border-l-[3px] border-l-sand bg-panel-2' : 'hover:bg-panel-2/60'
                    }`}
                  >
                    <span
                      className="w-12 shrink-0 font-mono text-[18px] leading-5 font-medium"
                      style={{ color: magColor(q.mag) }}
                    >
                      {formatMag(q.mag)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] leading-[20px] text-sand">{q.place}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-muted">
                        {formatRelative(q.time)} · {formatLimaDateTime(q.time)}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-muted">
                        {formatKm(q.kmToCity)} {q.nearestCity} · {Math.round(q.depthKm)} km · {REGION_LABEL[q.region]} · {q.source}
                        {q.offshore ? <span className="text-sea"> · fosa</span> : null}
                        {q.intensity ? ` · ${q.intensity}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
