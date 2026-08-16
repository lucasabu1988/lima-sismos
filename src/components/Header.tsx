import { RefreshCw } from 'lucide-react'
import { formatLimaClock, formatRelative } from '../lib/format'

interface Props {
  lastUpdated: number | null
  loading: boolean
  sourcesOk: { igp: boolean; usgs: boolean; cenvul: boolean; ptwc: boolean }
  onReload: () => void
}

export function Header({ lastUpdated, loading, sourcesOk, onReload }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/92 backdrop-blur-[8px]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between xl:px-6">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 72 36" className="h-8 w-[64px] shrink-0 text-foam" aria-hidden>
            <path
              className="wave-line"
              d="M2 22 C10 22 10 8 18 8 C26 8 26 28 34 28 C42 28 42 12 50 12 C58 12 58 22 70 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <div>
            <p className="overline">Observatorio nacional</p>
            <h1 className="font-display text-[28px] leading-[30px] tracking-[-0.012em] text-sand xl:text-[34px] xl:leading-9">
              Sismo Perú
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel-2 px-3 py-1.5">
            <span className="live-dot" />
            <span className="text-[11px] font-medium text-foam">EN VIVO</span>
            <span className="font-mono text-[11px] tracking-wide text-muted">
              {lastUpdated ? `${formatRelative(lastUpdated)} · ${formatLimaClock(lastUpdated)}` : 'conectando'}
            </span>
          </span>
          <span className="inline-flex items-center gap-3 border border-line bg-panel px-3 py-1.5 font-mono text-[11px] tracking-wide">
            <Lamp ok={sourcesOk.igp} label="IGP" />
            <Lamp ok={sourcesOk.usgs} label="USGS" />
            <Lamp ok={sourcesOk.cenvul} label="CENVUL" />
            <Lamp ok={sourcesOk.ptwc} label="PTWC" />
          </span>
          <button
            type="button"
            onClick={onReload}
            className="inline-flex h-8 items-center gap-1.5 border border-line px-3 text-sand hover:text-foam"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-[12px]">Actualizar</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function Lamp({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className={`h-[5px] w-[5px] rounded-full ${ok ? 'bg-foam' : 'bg-copper'}`} />
      {label}
    </span>
  )
}
