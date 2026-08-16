import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeedState, Quake } from '../types'
import {
  fetchCenvulLatest,
  fetchCenvulVolcanoes,
  fetchIgpCatalog,
  fetchIgpLatest,
  fetchIgpStats,
  fetchUsgs,
  igpLatestToQuake,
  mergeCatalogs,
} from '../lib/sources'
import { evaluateTsunami, fetchPtwc } from '../lib/tsunami'

const EMPTY: FeedState = {
  quakes: [],
  igpLatest: null,
  igpYearTotal: null,
  igpMonthly: [],
  volcanoes: [],
  volcanoBulletin: null,
  tsunami: null,
  lastUpdated: null,
  loading: true,
  error: null,
  sourcesOk: { igp: false, usgs: false, cenvul: false, ptwc: false },
}

export function useSeismicFeed(intervalMs = 60_000) {
  const [state, setState] = useState<FeedState>(EMPTY)
  const tick = useRef(0)

  const load = useCallback(async (background = false) => {
    const controller = new AbortController()
    if (!background) {
      setState((s) => ({ ...s, loading: s.quakes.length === 0, error: null }))
    }

    const year = new Date().getFullYear()
    const [igpLatest, igpCatalog, igpPrev, igpStats, usgs, volcanoes, bulletin, ptwc] =
      await Promise.allSettled([
        fetchIgpLatest(controller.signal),
        fetchIgpCatalog(year, controller.signal),
        fetchIgpCatalog(year - 1, controller.signal),
        fetchIgpStats(controller.signal),
        fetchUsgs(controller.signal),
        fetchCenvulVolcanoes(controller.signal),
        fetchCenvulLatest(controller.signal),
        fetchPtwc(controller.signal),
      ])

    const igpOk =
      igpLatest.status === 'fulfilled' ||
      igpCatalog.status === 'fulfilled' ||
      igpPrev.status === 'fulfilled'
    const usgsOk = usgs.status === 'fulfilled'
    const cenvulOk = volcanoes.status === 'fulfilled' || bulletin.status === 'fulfilled'
    const ptwcOk = ptwc.status === 'fulfilled'

    let igpQuakes: Quake[] = [
      ...(igpCatalog.status === 'fulfilled' ? igpCatalog.value : []),
      ...(igpPrev.status === 'fulfilled' ? igpPrev.value : []),
    ]
    const latest = igpLatest.status === 'fulfilled' ? igpLatest.value : null
    if (latest) {
      const asQuake = igpLatestToQuake(latest)
      if (asQuake && !igpQuakes.some((q) => q.id === asQuake.id)) {
        igpQuakes = [asQuake, ...igpQuakes]
      }
    }

    const usgsQuakes = usgs.status === 'fulfilled' ? usgs.value : []
    const merged = mergeCatalogs(igpQuakes, usgsQuakes)

    const errors = [igpLatest, igpCatalog, usgs]
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))

    setState({
      quakes: merged,
      igpLatest: latest,
      igpYearTotal: igpStats.status === 'fulfilled' ? igpStats.value.total : igpQuakes.length || null,
      igpMonthly: igpStats.status === 'fulfilled' ? igpStats.value.monthly : [],
      volcanoes: volcanoes.status === 'fulfilled' ? volcanoes.value : [],
      volcanoBulletin: bulletin.status === 'fulfilled' ? bulletin.value : null,
      tsunami:
        ptwc.status === 'fulfilled'
          ? evaluateTsunami(ptwc.value, merged)
          : evaluateTsunami([], merged),
      lastUpdated: Date.now(),
      loading: false,
      error: !igpOk && !usgsOk ? errors[0] ?? 'No se pudieron cargar las fuentes' : null,
      sourcesOk: { igp: igpOk, usgs: usgsOk, cenvul: cenvulOk, ptwc: ptwcOk },
    })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    void load(false)
    const id = window.setInterval(() => {
      tick.current += 1
      void load(true)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [load, intervalMs])

  return { ...state, reload: () => load(false) }
}
