import { useMemo, useState } from 'react'
import type { Volcano, VolcanoBulletin } from '../types'
import { formatLimaClock, formatLimaDateTime, formatRelative } from '../lib/format'
import { useRemoteImage } from '../hooks/useRemoteImage'

const SEMAPHORE_COLOR: Record<string, string> = {
  Verde: '#7dffc3',
  Amarillo: '#d4a017',
  Naranja: '#e8a45a',
  Rojo: '#c44b32',
}

export function VolcanoPanel({
  volcanoes,
  bulletin,
  selectedId,
  onSelect,
}: {
  volcanoes: Volcano[]
  bulletin: VolcanoBulletin | null
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const selected =
    volcanoes.find((v) => v.id === selectedId) ?? volcanoes.find((v) => v.id === bulletin?.volcanoId)
  const color = bulletin ? SEMAPHORE_COLOR[bulletin.semaphore] ?? '#e8dcc6' : '#8aa39a'
  const [camIndex, setCamIndex] = useState(0)
  const cameras = selected?.cameras ?? []
  const camera = cameras[Math.min(camIndex, Math.max(0, cameras.length - 1))]

  return (
    <aside className="panel overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <p className="overline">Sismicidad volcánica · CENVUL</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-[22px] leading-[26px] text-sand">
            {bulletin ? `Volcán ${bulletin.volcanoName}` : 'Arco volcánico del sur'}
          </h2>
          {bulletin ? (
            <span className="rounded-full border px-3 py-1 font-mono text-xs" style={{ color, borderColor: `${color}66` }}>
              alerta {bulletin.semaphore.toLowerCase()}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div>
          {bulletin ? (
            <>
              <p className="text-xs text-muted">
                {bulletin.report} · periodo {bulletin.period} · {formatRelative(bulletin.time)}
              </p>
              {bulletin.seismicCount != null ? (
                <p className="mt-2 font-mono text-3xl text-copper">{bulletin.seismicCount} sismos en el periodo</p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-sand/80">{bulletin.summary}</p>
              {bulletin.pdfUrl ? (
                <a
                  className="mt-3 inline-block text-xs text-foam underline-offset-2 hover:underline"
                  href={bulletin.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Boletín CENVUL en PDF
                </a>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted">Sin boletín CENVUL por ahora. Los volcanes vigilados siguen en el mapa.</p>
          )}

          {camera ? (
            <LiveCamera
              url={camera.url}
              title={camera.title}
              volcano={selected?.name ?? ''}
              options={cameras}
              index={camIndex}
              onIndex={setCamIndex}
            />
          ) : null}

          {selected?.seismogram ? <DailyHelicorder url={selected.seismogram} name={selected.name} /> : null}
        </div>

        <div>
          <p className="overline">Volcanes vigilados</p>
          <ul className="mt-2 max-h-[520px] space-y-1 overflow-y-auto scroll-thin">
            {volcanoes.map((v) => {
              const active = v.id === selected?.id
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(v.id)
                      setCamIndex(0)
                    }}
                    className={`flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                      active ? 'bg-copper/12 text-sand' : 'text-sand/80 hover:bg-panel-2'
                    }`}
                  >
                    <span>
                      <span className="block">{v.name}</span>
                      <span className="block text-[11px] text-muted">
                        {v.region}
                        {v.lastEruption ? ` · ${v.lastEruption}` : ''}
                        {v.cameras.length ? ' · cámara' : ''}
                      </span>
                    </span>
                    {v.id === bulletin?.volcanoId ? (
                      <span className="shrink-0 font-mono text-[10px] uppercase text-copper">activo</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </aside>
  )
}

function LiveCamera({
  url,
  title,
  volcano,
  options,
  index,
  onIndex,
}: {
  url: string
  title: string
  volcano: string
  options: Array<{ title: string; url: string }>
  index: number
  onIndex: (i: number) => void
}) {
  const image = useRemoteImage(url, 20_000)
  const fresh = image.ageMs != null && image.ageMs < 5 * 60_000

  return (
    <figure className="mt-4 overflow-hidden border border-line bg-ink-2">
      {image.src ? (
        <img src={image.src} alt={`${volcano} · ${title}`} className="w-full bg-black object-contain" />
      ) : (
        <div className="flex h-48 items-center justify-center text-sm text-muted">Cargando cámara…</div>
      )}
      <figcaption className="space-y-2 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] text-sand">
            <span className={`h-1.5 w-1.5 rounded-full ${fresh ? 'bg-foam' : 'bg-copper'}`} />
            Cámara en vivo · {volcano} · {title}
          </span>
          <span className="text-[11px] text-muted">
            {image.stamp
              ? `última foto ${formatLimaClock(image.stamp)} hora Lima (${formatRelative(image.stamp)})`
              : 'sin marca de tiempo'}
          </span>
        </div>
        {options.length > 1 ? (
          <div className="flex flex-wrap gap-1">
            {options.map((c, i) => (
              <button
                key={c.url}
                type="button"
                onClick={() => onIndex(i)}
                className={`border px-2 py-0.5 text-[10px] ${
                  i === index ? 'border-foam/50 text-foam' : 'border-line text-muted'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        ) : null}
      </figcaption>
    </figure>
  )
}

function DailyHelicorder({ url, name }: { url: string; name: string }) {
  const image = useRemoteImage(url, 60_000)
  const nowPct = useMemo(() => helicorderNowPercent(), [image.stamp, image.src])
  const stale = image.ageMs != null && image.ageMs > 25 * 60_000

  return (
    <figure className="mt-4 overflow-hidden border border-line bg-ink-2">
      <div className="relative">
        {image.src ? (
          <img src={image.src} alt={`Helicorder diario ${name}`} className="w-full" />
        ) : null}
        {nowPct != null ? (
          <div
            className="pointer-events-none absolute left-[4%] right-[8%] border-t border-dashed border-foam/80"
            style={{ top: `${nowPct}%` }}
          >
            <span className="absolute -top-5 right-0 rounded bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] text-foam">
              ahora
            </span>
          </div>
        ) : null}
      </div>
      <figcaption className="px-3 py-2 text-[11px] text-muted">
        <span className={stale ? 'text-copper' : ''}>
          Helicorder del día · {name} · no es un stream
        </span>
        {image.stamp ? ` · última traza ${formatLimaDateTime(image.stamp)}` : ''}
        {stale
          ? ' · el IGP no está publicando líneas nuevas'
          : ' · el recuadro en blanco son horas que todavía no ocurren'}
      </figcaption>
    </figure>
  )
}

function limaHourDecimal(now = Date.now()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(now))
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour + minute / 60
}

/** Página diurna IGP: 07:00–19:00 hora Lima. */
function helicorderNowPercent(now = Date.now()): number | null {
  const t = limaHourDecimal(now)
  const start = 7
  const end = 19
  if (t < start - 0.05) return null
  const clamped = Math.min(end, Math.max(start, t))
  return 7.2 + ((clamped - start) / (end - start)) * 85.5
}
