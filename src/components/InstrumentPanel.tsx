import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import gnss from '../data/gnss-series.json'
import { useIrisSpectrum } from '../hooks/useIrisSpectrum'
import { SPECTRUM_STATION } from '../lib/spectrum'

export function InstrumentPanel() {
  const spec = useIrisSpectrum()

  return (
    <section className="grid gap-4 lg:grid-cols-12">
      <div className="panel lg:col-span-7">
        <div className="border-b border-line px-4 py-3">
          <p className="overline">GNSS · deformación de la placa</p>
          <p className="mt-1 text-[13px] text-sand-dim">
            Posición diaria Nevada Geodetic Lab (IGS20). Velocidad = ajuste de los últimos 3 años, mm/año.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="font-mono text-[11px] text-muted">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Estación</th>
                <th className="px-3 py-2 font-medium">Este</th>
                <th className="px-3 py-2 font-medium">Norte</th>
                <th className="px-3 py-2 font-medium">Vertical</th>
                <th className="px-3 py-2 font-medium">Serie este (3 años)</th>
              </tr>
            </thead>
            <tbody>
              {gnss.stations.map((s) => (
                <tr key={s.id} className="border-b border-line-soft">
                  <td className="px-4 py-2">
                    <p className="text-sand">{s.name}</p>
                    <p className="font-mono text-[11px] text-muted">
                      {s.id} · {s.place}
                    </p>
                  </td>
                  <td className="px-3 py-2 font-mono text-sand">{fmtVel(s.ve)}</td>
                  <td className="px-3 py-2 font-mono text-sand">{fmtVel(s.vn)}</td>
                  <td className="px-3 py-2 font-mono text-muted">{fmtVel(s.vu)}</td>
                  <td className="px-3 py-2 w-[220px]">
                    <div className="h-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={s.series} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
                          <Line type="monotone" dataKey="e" stroke="#6ec3d8" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[12px] text-muted">
          Fuente: NGL / Universidad de Nevada. El IGP opera la red nacional, pero no publica la traza diaria en API; este es el archivo público equivalente.
        </p>
      </div>

      <div className="panel lg:col-span-5">
        <div className="border-b border-line px-4 py-3">
          <p className="overline">Espectro en hertz · FDSN</p>
          <p className="mt-1 text-[13px] text-sand-dim">
            {SPECTRUM_STATION.name} ({SPECTRUM_STATION.net}.{SPECTRUM_STATION.sta} {SPECTRUM_STATION.cha}) · {SPECTRUM_STATION.place}.
            60 s de onda, FFT. La RSN del IGP no suelta miniSEED.
          </p>
        </div>
        <div className="p-4">
          {spec.loading && !spec.data ? (
            <p className="text-[13px] text-muted">Pidiendo traza a IRIS…</p>
          ) : spec.error && !spec.data ? (
            <p className="text-[13px] text-copper">No hay onda reciente: {spec.error}</p>
          ) : spec.data ? (
            <>
              <div className="mb-3 flex flex-wrap gap-4 font-mono text-[12px]">
                <span>fs {spec.data.sps} Hz</span>
                <span>N {spec.data.n}</span>
                <span className="text-foam">pico {spec.data.peakHz.toFixed(2)} Hz</span>
                <span className="text-muted">{spec.data.start.slice(0, 19)}</span>
              </div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spec.data.bins} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <XAxis dataKey="hz" tick={{ fill: '#8aa39a', fontSize: 10 }} tickFormatter={(v) => `${v}`} />
                    <YAxis tick={{ fill: '#8aa39a', fontSize: 10 }} />
                    <Tooltip
                      content={({ payload }) => {
                        const p = payload?.[0]?.payload as { hz: number; amp: number } | undefined
                        if (!p) return null
                        return (
                          <div className="border border-line bg-panel px-2 py-1 font-mono text-[11px]">
                            {p.hz.toFixed(2)} Hz · amp {p.amp.toFixed(2)}
                          </div>
                        )
                      }}
                    />
                    <Line type="monotone" dataKey="amp" stroke="#7dffc3" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[12px] text-muted">
                El pico es ruido ambiente (océano, viento, tráfico), no un “tono de la placa”. Se refresca cada 3 min.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function fmtVel(v: number | null) {
  if (v == null || !Number.isFinite(v)) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(1)} mm/a`
}
