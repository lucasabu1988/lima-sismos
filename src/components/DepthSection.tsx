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
import { formatMag, magColor } from '../lib/format'
import { LIMA } from '../lib/geo'

export function DepthSection({ quakes }: { quakes: Quake[] }) {
  const data = quakes.map((q) => ({
    lon: q.lon,
    depth: q.depthKm,
    mag: q.mag,
    fill: magColor(q.mag),
    place: q.place,
    offshore: q.offshore,
  }))

  return (
    <div className="panel h-[280px] p-4 lg:h-[320px]">
      <p className="overline">Corte de profundidad</p>
      <p className="mb-2 mt-1 text-[13px] leading-5 text-sand-dim">
        Fosa (oeste) → continente (este). Nazca se hunde bajo los Andes. Lima {LIMA.lon.toFixed(1)}°.
      </p>
      {data.length === 0 ? (
        <p className="mt-10 text-center text-[13px] text-muted">Sin eventos para el corte.</p>
      ) : (
        <ResponsiveContainer width="100%" height="78%">
          <ScatterChart margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="#243530" strokeDasharray="2 4" strokeOpacity={0.7} />
            <XAxis
              dataKey="lon"
              type="number"
              domain={['dataMin - 0.2', 'dataMax + 0.2']}
              reversed
              tick={{ fill: '#8aa39a', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickFormatter={(v) => `${Number(v).toFixed(1)}°`}
            />
            <YAxis
              dataKey="depth"
              type="number"
              reversed
              domain={[0, 'auto']}
              tick={{ fill: '#8aa39a', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              label={{ value: 'km', angle: -90, fill: '#8aa39a', fontSize: 10 }}
            />
            <Tooltip
              content={({ payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[0] | undefined
                if (!p) return null
                return (
                  <div className="border border-line bg-panel px-3 py-2 text-[12px]">
                    <p className="font-mono text-foam">
                      M {formatMag(p.mag)} · {Math.round(p.depth)} km
                    </p>
                    <p className="text-sand">{p.place}</p>
                    <p className="text-muted">
                      {p.offshore ? 'fosa' : 'continente'} · {p.lon.toFixed(2)}°
                    </p>
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
