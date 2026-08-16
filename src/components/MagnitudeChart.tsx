import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Quake } from '../types'
import { formatLimaDateTime, magColor } from '../lib/format'

export function MagnitudeChart({ quakes }: { quakes: Quake[] }) {
  const data = [...quakes]
    .sort((a, b) => a.time - b.time)
    .map((q) => ({
      t: q.time,
      mag: q.mag,
      fill: magColor(q.mag),
      place: q.place,
    }))

  return (
    <div className="panel h-[280px] p-4 lg:h-[320px]">
      <p className="overline">Magnitud en el tiempo</p>
      <p className="mb-2 mt-1 text-[13px] leading-5 text-sand-dim">Cada punto es un sismo del filtro.</p>
      {data.length === 0 ? (
        <p className="mt-10 text-center text-[13px] text-muted">Sin eventos para graficar.</p>
      ) : (
        <ResponsiveContainer width="100%" height="78%">
          <ScatterChart margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#243530" strokeDasharray="2 4" />
            <XAxis
              dataKey="t"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v) =>
                new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(v)
              }
              tick={{ fill: '#8aa39a', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            />
            <YAxis
              dataKey="mag"
              domain={[2, 'auto']}
              tick={{ fill: '#8aa39a', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            />
            <Tooltip
              cursor={{ stroke: '#7dffc3', strokeDasharray: '3 3' }}
              content={({ payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[0] | undefined
                if (!p) return null
                return (
                  <div className="border border-line bg-panel px-3 py-2 text-[12px]">
                    <p className="font-mono text-foam">M {p.mag.toFixed(1)}</p>
                    <p className="text-sand">{p.place}</p>
                    <p className="text-muted">{formatLimaDateTime(p.t)}</p>
                  </div>
                )
              }}
            />
            <Scatter data={data} isAnimationActive={false} shape={<Dot />} />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function Dot(props: { cx?: number; cy?: number; payload?: { fill: string; mag: number } }) {
  const { cx = 0, cy = 0, payload } = props
  return <circle cx={cx} cy={cy} r={2.4 + (payload?.mag ?? 3) * 0.45} fill={payload?.fill ?? '#7dffc3'} />
}
