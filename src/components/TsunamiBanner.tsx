import type { TsunamiStatus } from '../types'
import { formatLimaDateTime, formatRelative } from '../lib/format'

const RAIL: Record<TsunamiStatus['level'], string> = {
  clear: 'border-l-foam bg-foam/10',
  information: 'border-l-sea bg-sea/12',
  potential: 'border-l-copper bg-copper/[0.14]',
  advisory: 'border-l-amber bg-amber/16',
  watch: 'border-l-ember bg-ember/18',
  warning: 'border-l-ember bg-ember/24',
}

const LABEL: Record<TsunamiStatus['level'], string> = {
  clear: 'sin amenaza',
  information: 'información',
  potential: 'potencial local',
  advisory: 'aviso',
  watch: 'vigilancia',
  warning: 'alerta',
}

export function TsunamiBanner({ status }: { status: TsunamiStatus | null }) {
  if (!status) {
    return (
      <div className="border-b border-line border-l-4 border-l-muted px-4 py-2 text-[13px] text-muted">
        Consultando boletines PTWC…
      </div>
    )
  }

  const latest = status.bulletins[0]
  const compact = status.level === 'clear'

  return (
    <section className={`border-b border-line border-l-4 px-4 ${compact ? 'py-2' : 'py-3'} ${RAIL[status.level]}`}>
      {compact ? (
        <p className="text-[13px] text-sand-dim">
          <span className="font-medium text-sand">{status.title}</span>
          <span className="text-muted"> · DHN / PTWC</span>
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="overline">Tsunami · Pacífico</p>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted">{LABEL[status.level]}</p>
          </div>
          <p className="mt-1 font-display text-[22px] leading-[26px] text-sand">{status.title}</p>
          <p className="mt-1 max-w-[88ch] text-[13px] leading-5 text-sand-dim">{status.detail}</p>
          {latest ? (
            <p className="mt-2 font-mono text-[11px] text-muted">
              PTWC {latest.category || 'boletín'} · {latest.region} · {formatRelative(latest.time)} · {formatLimaDateTime(latest.time)}
              {latest.url ? (
                <>
                  {' · '}
                  <a className="text-foam underline-offset-2 hover:underline" href={latest.url} target="_blank" rel="noreferrer">
                    leer boletín
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          <p className="mt-1 text-[12px] leading-[18px] text-muted">
            <a className="text-foam underline-offset-2 hover:underline" href="https://www.tsunami.gov/" target="_blank" rel="noreferrer">
              PTWC
            </a>
            {' · autoridad nacional '}
            <a className="text-foam underline-offset-2 hover:underline" href="https://www.dhn.mil.pe/" target="_blank" rel="noreferrer">
              DHN
            </a>
            . No sustituye una alerta oficial.
          </p>
        </>
      )}
    </section>
  )
}
