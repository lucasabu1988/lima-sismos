import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { AlertBanner } from './components/AlertBanner'
import { TsunamiBanner } from './components/TsunamiBanner'
import { Filters } from './components/Filters'
import { KpiStrip } from './components/KpiStrip'
import { QuakeMap } from './components/QuakeMap'
import { EventList } from './components/EventList'
import { MagnitudeChart } from './components/MagnitudeChart'
import { DepthSection } from './components/DepthSection'
import { ContextPanel } from './components/ContextPanel'
import { VolcanoPanel } from './components/VolcanoPanel'
import { InstrumentPanel } from './components/InstrumentPanel'
import { useSeismicFeed } from './hooks/useSeismicFeed'
import { computeAlert, filterQuakes } from './lib/activity'
import type { TimeWindow, ZoneFilter } from './types'

export default function App() {
  const feed = useSeismicFeed(75_000)
  const [zone, setZone] = useState<ZoneFilter>('peru')
  const [window, setWindow] = useState<TimeWindow>('30d')
  const [minMag, setMinMag] = useState(3)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedVolcanoId, setSelectedVolcanoId] = useState<number | null>(null)

  const visible = useMemo(
    () => filterQuakes(feed.quakes, zone, window, minMag),
    [feed.quakes, zone, window, minMag],
  )

  const alert = useMemo(() => computeAlert(feed.quakes), [feed.quakes])
  const latestInView = visible[0] ?? null

  return (
    <div className="min-h-dvh">
      <Header
        lastUpdated={feed.lastUpdated}
        loading={feed.loading}
        sourcesOk={feed.sourcesOk}
        onReload={feed.reload}
      />

      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 xl:px-6">
        {feed.error ? (
          <div className="border border-line border-l-4 border-l-ember bg-ember/20 px-4 py-3 text-[13px] text-sand">
            No se pudo leer ninguna fuente: {feed.error}. Comprueba la red o vuelve a intentar.
          </div>
        ) : null}

        <TsunamiBanner status={feed.tsunami} />
        <AlertBanner alert={alert} />
        <Filters
          zone={zone}
          window={window}
          minMag={minMag}
          activity={alert.level}
          onZone={setZone}
          onWindow={setWindow}
          onMinMag={setMinMag}
        />

        <KpiStrip
          latestInView={latestInView}
          igpLatest={feed.igpLatest}
          events={visible}
          yearTotal={feed.igpYearTotal}
        />

        <section className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
          <QuakeMap
            quakes={visible}
            volcanoes={feed.volcanoes}
            tsunamiBulletins={feed.tsunami?.bulletins ?? []}
            activeVolcanoId={selectedVolcanoId ?? feed.volcanoBulletin?.volcanoId ?? null}
            zone={zone}
            selectedId={selectedId ?? latestInView?.id ?? null}
            onSelect={setSelectedId}
            onSelectVolcano={setSelectedVolcanoId}
          />
          </div>
          <div className="lg:col-span-4">
          <EventList
            quakes={visible}
            selectedId={selectedId ?? latestInView?.id ?? null}
            onSelect={setSelectedId}
          />
          </div>
        </section>

        <InstrumentPanel />

        <VolcanoPanel
          volcanoes={feed.volcanoes}
          bulletin={feed.volcanoBulletin}
          selectedId={selectedVolcanoId ?? feed.volcanoBulletin?.volcanoId ?? null}
          onSelect={setSelectedVolcanoId}
        />

        <section className="grid gap-4 lg:grid-cols-2">
          <MagnitudeChart quakes={visible} />
          <DepthSection quakes={visible} />
        </section>

        <ContextPanel
          monthly={feed.igpMonthly}
          yearTotal={feed.igpYearTotal}
          igpLatest={feed.igpLatest}
          events={visible}
        />

        {feed.loading && feed.quakes.length === 0 ? (
          <p className="pb-6 text-center text-sm text-muted">Cargando catálogo IGP y USGS…</p>
        ) : (
          <p className="pb-8 text-center text-[12px] leading-[18px] text-muted">
            Actualización automática cada 75 s. Horarios en America/Lima. El IGP suele reportar sismos
            peruanos más pequeños que el USGS; el mapa prioriza el reporte oficial peruano cuando ambos coinciden.
          </p>
        )}
      </main>
    </div>
  )
}
