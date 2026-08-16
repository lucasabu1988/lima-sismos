import type { IgpLatest, Quake } from '../types'
import { countByRegion } from '../lib/activity'
import season from '../data/monthly-season.json'
import seasonM6 from '../data/monthly-m6.json'
import seasonM7 from '../data/monthly-m7.json'
import mechanisms from '../data/mechanism-summary.json'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function ContextPanel({
  monthly,
  yearTotal,
  igpLatest,
  events,
}: {
  monthly: number[]
  yearTotal: number | null
  igpLatest: IgpLatest | null
  events: Quake[]
}) {
  const max = Math.max(1, ...monthly)
  const regions = countByRegion(events)
  const regionMax = Math.max(1, regions.norte, regions.centro, regions.sur, regions.oriente)

  return (
    <aside className="panel p-4">
      <p className="overline">Contexto</p>
      <h2 className="mt-1 font-display text-[22px] leading-[26px] text-sand">El Perú sísmico</h2>
      <p className="mt-2 max-w-[68ch] text-[14px] leading-[23px] text-sand-dim">
        Casi todo el país vive sobre el contacto entre la placa de Nazca y Sudamérica. La costa y la fosa
        concentran los sismos más grandes; la sierra tiene sismos corticales más superficiales; el oriente
        es, en general, más silencioso. El IGP documenta brechas sísmicas en tramos de la costa —incluida
        Lima— donde falta un gran evento hace siglos. Este tablero no predice terremotos: muestra lo que
        está pasando ahora.
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <p className="overline">
            Reportes IGP {new Date().getFullYear()} {yearTotal != null ? `· ${yearTotal}` : ''}
          </p>
          <div className="mt-3 grid grid-cols-12 items-end gap-1">
            {MONTHS.map((m, i) => {
              const n = monthly[i] ?? 0
              const h = 8 + (n / max) * 56
              const current = i === new Date().getMonth()
              return (
                <div key={m} className="flex flex-col items-center gap-1">
                  <span className="font-mono text-[10px] text-muted">{n || ''}</span>
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: h,
                      background: current ? '#7dffc3' : '#2a4a42',
                      opacity: n ? 1 : 0.25,
                    }}
                  />
                  <span className="text-[9px] text-muted">{m}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <p className="overline">Distribución en esta vista</p>
          <div className="mt-3 space-y-2">
            {(
              [
                ['Norte', regions.norte],
                ['Centro', regions.centro],
                ['Sur', regions.sur],
                ['Oriente', regions.oriente],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-muted">{label}</span>
                <div className="h-1 flex-1 overflow-hidden bg-line">
                  <div
                    className="h-full bg-foam/80"
                    style={{ width: `${(n / regionMax) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-sand">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="overline">Correlación con mecanismos medibles</p>
        <p className="mt-1 max-w-[72ch] text-[13px] leading-5 text-sand-dim">
          {mechanisms.nM4.toLocaleString('es-PE')} sismos M≥4 en {mechanisms.nMonths} meses ({mechanisms.window}),
          cruzados con ONI, SOI, manchas solares, estación de lluvias y fase lunar. Ningún índice predice.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {mechanisms.tests.map((t) => (
            <div key={t.name} className="border border-line-soft px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] text-sand">{t.name}</p>
                <p className="font-mono text-[11px] text-muted">
                  {t.r != null ? `r=${t.r.toFixed(3)}` : t.chi2 != null ? `χ²=${t.chi2}` : t.ratio != null ? `húmedo/seco=${t.ratio}` : ''}
                  {' · '}
                  {t.verdict}
                </p>
              </div>
              <p className="mt-1 text-[12px] leading-[18px] text-sand-dim">{t.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <SeasonBlock title={seasonM7.usgs.label} total={seasonM7.usgs.total} years={seasonM7.usgs.years} rows={seasonM7.usgs.rows} />
        <SeasonBlock title={seasonM7.igp.label} total={seasonM7.igp.total} years={seasonM7.igp.years} rows={seasonM7.igp.rows} />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <SeasonBlock title={seasonM6.usgs.label} total={seasonM6.usgs.total} years={seasonM6.usgs.years} rows={seasonM6.usgs.rows} />
        <SeasonBlock title={seasonM6.igp.label} total={seasonM6.igp.total} years={seasonM6.igp.years} rows={seasonM6.igp.rows} />
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <SeasonBlock title={season.usgs.label} total={season.usgs.total} years={season.usgs.years} rows={season.usgs.rows} />
        <SeasonBlock title={season.igp.label} total={season.igp.total} years={season.igp.years} rows={season.igp.rows} />
      </div>

      <div className="mt-5 space-y-2 text-[12px] leading-[18px] text-muted">
        <p>
          Fuentes:{' '}
          <a className="text-foam underline-offset-2 hover:underline" href="https://ultimosismo.igp.gob.pe/" target="_blank" rel="noreferrer">
            IGP / CENSIS
          </a>
          {' · '}
          <a className="text-foam underline-offset-2 hover:underline" href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer">
            USGS
          </a>
        </p>
        {igpLatest?.mapUrl ? (
          <a className="text-foam underline-offset-2 hover:underline" href={igpLatest.mapUrl} target="_blank" rel="noreferrer">
            Mapa temático del último sismo IGP
          </a>
        ) : null}
        <p>
          No es un sistema de alerta temprana. Para emergencias usa Sismos Perú (IGP), INDECI y DHN.
        </p>
      </div>
    </aside>
  )
}

function SeasonBlock({
  title,
  total,
  years,
  rows,
}: {
  title: string
  total: number
  years: number
  rows: Array<{ name: string; count: number; pct: number; avg: number }>
}) {
  const max = Math.max(...rows.map((r) => r.pct))
  return (
    <div>
      <p className="overline">{title}</p>
      <p className="mt-1 font-mono text-[11px] text-muted">
        {total.toLocaleString('es-PE')} eventos · {years} años · uniforme 8.33%
      </p>
      <div className="mt-3 space-y-1">
        {rows.map((r) => (
          <div key={r.name} className="grid grid-cols-[36px_1fr_52px_48px] items-center gap-2 text-[12px]">
            <span className="text-muted">{r.name}</span>
            <div className="h-1 bg-line">
              <div className="h-full bg-sea" style={{ width: `${(r.pct / max) * 100}%` }} />
            </div>
            <span className="text-right font-mono text-sand">{r.pct.toFixed(1)}%</span>
            <span className="text-right font-mono text-muted">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
