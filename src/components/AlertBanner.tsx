import type { AlertInfo } from '../types'

const RAIL: Record<AlertInfo['level'], string> = {
  calma: 'border-l-foam bg-foam/10 text-foam',
  normal: 'border-l-sea bg-sea/12 text-sea',
  elevada: 'border-l-copper bg-copper/[0.14] text-copper',
  alta: 'border-l-amber bg-amber/16 text-amber',
  alerta: 'border-l-ember bg-ember/24 text-ember',
}

export function AlertBanner({ alert }: { alert: AlertInfo }) {
  if (alert.level === 'calma' || alert.level === 'normal') return null

  return (
    <div className={`border-b border-line border-l-4 px-4 py-3 ${RAIL[alert.level]}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="overline text-inherit/80">Estado del territorio</p>
        <p className="font-mono text-[11px] uppercase tracking-wide">{alert.level}</p>
      </div>
      <p className="mt-1 font-display text-[22px] leading-[26px] text-sand">{alert.title}</p>
      <p className="mt-1 max-w-[88ch] text-[13px] leading-5 text-sand-dim">{alert.detail}</p>
    </div>
  )
}

export function ActivityLamp({ level }: { level: AlertInfo['level'] }) {
  const color =
    level === 'alerta' || level === 'alta'
      ? 'bg-ember text-ember'
      : level === 'elevada'
        ? 'bg-copper text-copper'
        : level === 'normal'
          ? 'bg-sea text-sea'
          : 'bg-foam text-foam'
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide ${color.replace('bg-', 'text-')}`}>
      <span className={`h-[5px] w-[5px] rounded-full ${color.split(' ')[0]}`} />
      {level}
    </span>
  )
}
