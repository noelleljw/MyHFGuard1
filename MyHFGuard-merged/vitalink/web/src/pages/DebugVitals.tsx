import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import { getPatientVitals, serverUrl } from "@/lib/api"
import { format as formatDate, startOfDay, startOfWeek, endOfDay, addDays, addWeeks, addMonths } from "date-fns"
import { supabase } from "@/lib/supabase"

export default function DebugVitals() {
  const [patientId, setPatientId] = useState<string | undefined>(() => {
    const p = new URLSearchParams(window.location.search)
    return p.get("patientId") || undefined
  })
  const [timePeriod, setTimePeriod] = useState<"daily" | "weekly" | "monthly">(() => {
    const p = new URLSearchParams(window.location.search)
    const v = p.get("period")
    return v === "weekly" ? "weekly" : (v === "monthly" ? "monthly" : "daily")
  })
  const [currentPeriod, setCurrentPeriod] = useState(() => {
    const p = new URLSearchParams(window.location.search)
    const v = p.get("date")
    return v ? new Date(v) : new Date()
  })

  useEffect(() => {
    let mounted = true
    async function init() {
      if (patientId) return
      const { data } = await supabase.auth.getSession()
      const id = data?.session?.user?.id || undefined
      if (mounted) setPatientId(id)
    }
    init()
    return () => { mounted = false }
  }, [patientId])

  const period = timePeriod === "weekly" ? "weekly" : (timePeriod === "monthly" ? "monthly" : "hourly")
  const selectedDay = formatDate(currentPeriod, "yyyy-MM-dd")
  const tzOffset = 0 - new Date().getTimezoneOffset()

  const query = useQuery({
    queryKey: ["patient-vitals-debug", patientId, period, selectedDay, tzOffset],
    queryFn: () => getPatientVitals(
      patientId,
      period,
      timePeriod === "daily" ? selectedDay : undefined,
      timePeriod === "daily" ? tzOffset : undefined,
    ),
    refetchOnWindowFocus: false,
    enabled: !!patientId,
  })

  const vitals = query.data?.vitals || {}
  const toDayKey = (t: string) => {
    const d = new Date(t)
    return isNaN(d.getTime()) ? String(t) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  const hrSrcRaw = (vitals.hr || [])
  const spo2SrcRaw = (vitals.spo2 || [])
  const stepsSrcRaw = (vitals.steps || [])

  const hrSrc = timePeriod === "daily" ? hrSrcRaw.filter((r: any) => toDayKey(r.time) === selectedDay) : hrSrcRaw
  const spo2Src = timePeriod === "daily" ? spo2SrcRaw.filter((r: any) => toDayKey(r.time) === selectedDay) : spo2SrcRaw
  const stepsSrc = timePeriod === "daily" ? stepsSrcRaw.filter((r: any) => toDayKey(r.time) === selectedDay) : stepsSrcRaw

  const hr = useMemo(() => {
    if (period !== "hourly") {
      const agg = Object.entries(hrSrc.reduce((acc: Record<string, { min: number[]; avg: number[]; max: number[] }>, r: any) => {
        const k = toDayKey(r.time)
        const o = acc[k] || { min: [], avg: [], max: [] }
        if (typeof r.min === "number") o.min.push(r.min)
        if (typeof r.avg === "number") o.avg.push(r.avg)
        if (typeof r.max === "number") o.max.push(r.max)
        acc[k] = o
        return acc
      }, {})).map(([k, v]) => ({ time: k, min: v.min.length ? Math.min(...v.min) : undefined, avg: v.avg.length ? Math.round(v.avg.reduce((a, b) => a + b, 0) / v.avg.length) : undefined, max: v.max.length ? Math.max(...v.max) : undefined }))
        .sort((a, b) => new Date(a.time as any).getTime() - new Date(b.time as any).getTime())
      return agg
    }
    const out: any[] = []
    const start = startOfDay(currentPeriod)
    const byHour = new Map<number, { min: number[], avg: number[], max: number[] }>()
    hrSrc.forEach((r: any) => {
      const t = new Date(r.time); if (isNaN(t.getTime())) return
      const h = t.getHours()
      if (!byHour.has(h)) byHour.set(h, { min: [], avg: [], max: [] })
      const entry = byHour.get(h)!
      if (typeof r.min === "number") entry.min.push(r.min)
      if (typeof r.avg === "number") entry.avg.push(r.avg)
      if (typeof r.max === "number") entry.max.push(r.max)
    })
    for (let i = 0; i < 24; i++) {
      const d = new Date(start); d.setHours(i, 0, 0, 0)
      const time = d.toISOString()
      const buckets = byHour.get(i)
      if (!buckets || buckets.avg.length === 0) {
        out.push({ time, min: undefined, avg: undefined, max: undefined })
      } else {
        const min = buckets.min.length ? Math.min(...buckets.min) : undefined
        const max = buckets.max.length ? Math.max(...buckets.max) : undefined
        const avg = buckets.avg.length ? Math.round(buckets.avg.reduce((a, b) => a + b, 0) / buckets.avg.length) : undefined
        out.push({ time, min, avg, max })
      }
    }
    return out
  }, [period, hrSrc, currentPeriod])

  const spo2 = useMemo(() => {
    if (period !== "hourly") {
      const agg = Object.entries(spo2Src.reduce((acc: Record<string, { min: number[]; avg: number[]; max: number[] }>, r: any) => {
        const k = toDayKey(r.time)
        const o = acc[k] || { min: [], avg: [], max: [] }
        if (typeof r.min === "number") o.min.push(r.min)
        if (typeof r.avg === "number") o.avg.push(r.avg)
        if (typeof r.max === "number") o.max.push(r.max)
        acc[k] = o
        return acc
      }, {})).map(([k, v]) => ({ time: k, min: v.min.length ? Math.min(...v.min) : undefined, avg: v.avg.length ? Math.round(v.avg.reduce((a, b) => a + b, 0) / v.avg.length) : undefined, max: v.max.length ? Math.max(...v.max) : undefined }))
        .sort((a, b) => new Date(a.time as any).getTime() - new Date(b.time as any).getTime())
      return agg
    }
    const out: any[] = []
    const start = startOfDay(currentPeriod)
    const byHour = new Map<number, { min: number[], avg: number[], max: number[] }>()
    spo2Src.forEach((r: any) => {
      const t = new Date(r.time); if (isNaN(t.getTime())) return
      const h = t.getHours()
      if (!byHour.has(h)) byHour.set(h, { min: [], avg: [], max: [] })
      const entry = byHour.get(h)!
      if (typeof r.min === "number") entry.min.push(r.min)
      if (typeof r.avg === "number") entry.avg.push(r.avg)
      if (typeof r.max === "number") entry.max.push(r.max)
    })
    for (let i = 0; i < 24; i++) {
      const d = new Date(start); d.setHours(i, 0, 0, 0)
      const time = d.toISOString()
      const buckets = byHour.get(i)
      if (!buckets || buckets.avg.length === 0) {
        out.push({ time, min: undefined, avg: undefined, max: undefined })
      } else {
        const min = buckets.min.length ? Math.min(...buckets.min) : undefined
        const max = buckets.max.length ? Math.max(...buckets.max) : undefined
        const avg = buckets.avg.length ? Math.round(buckets.avg.reduce((a, b) => a + b, 0) / buckets.avg.length) : undefined
        out.push({ time, min, avg, max })
      }
    }
    return out
  }, [period, spo2Src, currentPeriod])

  const stepsHourly = useMemo(() => {
    const out: Array<{ time: string; count: number | null }> = []
    const start = startOfDay(currentPeriod)
    const byHour = new Map<number, number>()
    stepsSrc.forEach((r: any) => {
      const t = new Date(r.time); if (isNaN(t.getTime())) return
      const h = t.getHours()
      byHour.set(h, (byHour.get(h) || 0) + (typeof r.count === "number" ? r.count : 0))
    })
    for (let i = 0; i < 24; i++) {
      const d = new Date(start); d.setHours(i, 0, 0, 0)
      out.push({ time: d.toISOString(), count: byHour.has(i) ? (byHour.get(i) as number) : null })
    }
    return out
  }, [stepsSrc, currentPeriod])

  const hrForMerge = hr
  const spo2ForMerge = spo2
  const merged = (hrForMerge.length || spo2ForMerge.length)
    ? (hrForMerge.length >= spo2ForMerge.length
        ? hrForMerge.map((h: any, i: number) => ({
            date: h.time,
            heartRate: h.avg,
            heartRateMin: h.min,
            heartRateMax: h.max,
            spo2: spo2ForMerge[i]?.avg,
            spo2Min: spo2ForMerge[i]?.min,
            spo2Max: spo2ForMerge[i]?.max,
          }))
        : spo2ForMerge.map((o: any, i: number) => ({
            date: o.time,
            heartRate: hrForMerge[i]?.avg,
            heartRateMin: hrForMerge[i]?.min,
            heartRateMax: hrForMerge[i]?.max,
            spo2: o.avg,
            spo2Min: o.min,
            spo2Max: o.max,
          })))
    : []

  const hrDebug = hr.map((x: any) => ({ time: x.time, min: x.min ?? null, avg: x.avg ?? null, max: x.max ?? null }))
  const spo2Debug = spo2.map((x: any) => ({ time: x.time, min: x.min ?? null, avg: x.avg ?? null, max: x.max ?? null }))
  const mergedDebug = merged.map((x: any) => ({
    date: x.date,
    heartRate: x.heartRate ?? null,
    heartRateMin: x.heartRateMin ?? null,
    heartRateMax: x.heartRateMax ?? null,
    spo2: x.spo2 ?? null,
    spo2Min: x.spo2Min ?? null,
    spo2Max: x.spo2Max ?? null,
  }))

  const payload = {
    server: serverUrl(),
    params: {
      patientId,
      period,
      date: timePeriod === "daily" ? selectedDay : undefined,
      tzOffsetMin: timePeriod === "daily" ? tzOffset : undefined,
    },
    columns: {
      hr: ["min", "avg", "max"],
      spo2: ["min", "avg", "max"],
      steps: ["count"],
      bp: ["sys", "dia", "pulse"],
      weight: ["kg"],
    },
    raw: {
      hr: hrSrcRaw,
      spo2: spo2SrcRaw,
      steps: stepsSrcRaw,
    },
    filtered: {
      hr: hrSrc,
      spo2: spo2Src,
      steps: stepsSrc,
    },
    chartSeries: {
      hr: hrDebug,
      spo2: spo2Debug,
      stepsHourly,
      merged: mergedDebug,
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-2xl font-bold text-foreground mb-4">Debug Vitals JSON</h1>
        <Card className="p-4">
          <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(payload, null, 2)}</pre>
        </Card>
      </div>
    </div>
  )
}
