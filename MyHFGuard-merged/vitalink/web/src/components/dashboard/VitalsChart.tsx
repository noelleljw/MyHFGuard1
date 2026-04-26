import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Cell } from "recharts"
import { Activity, Droplet, Weight, TrendingUp, Heart, ChevronLeft, ChevronRight, Footprints } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getPatientVitals, serverUrl } from "@/lib/api"
import { formatTimeHM } from "@/lib/utils"
import { format as formatDate, differenceInCalendarWeeks, differenceInCalendarMonths, isYesterday, startOfWeek, startOfDay, endOfDay, addDays, addWeeks, addMonths } from "date-fns"
import { toast } from "sonner"

type Props = { patientId?: string }

const VitalsChart = ({ patientId }: Props) => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("heartRate")
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== "undefined" ? window.innerWidth < 640 : false)

  useEffect(() => {
    const onResize = () => setIsMobile(typeof window !== "undefined" ? window.innerWidth < 640 : false)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  const chartHeight = isMobile ? 420 : 320
  const [timePeriod, setTimePeriod] = useState<"daily" | "weekly" | "monthly">("daily")
  const [currentPeriod, setCurrentPeriod] = useState(new Date())
  const period = timePeriod === "weekly" ? "weekly" : (timePeriod === "monthly" ? "monthly" : "hourly")

  useEffect(() => {
    if (timePeriod === "daily" && (activeTab === "weight" || activeTab === "bloodPressure")) {
      setActiveTab("heartRate")
    }
  }, [timePeriod, activeTab])

  const { data, isLoading } = useQuery({
    queryKey: ["patient-vitals", patientId, period, formatDate(currentPeriod, "yyyy-MM-dd"), (0 - new Date().getTimezoneOffset())],
    queryFn: () => getPatientVitals(
      patientId,
      period,
      formatDate(currentPeriod, "yyyy-MM-dd"),
      (0 - new Date().getTimezoneOffset()),
    ),
    refetchOnWindowFocus: false,
    enabled: !!patientId,
  })
  const vitals = data?.vitals || {}
  
  // Helper to get Malaysia Hour (UTC+8) from a UTC ISO string
  // Returns 0-23. We treat the stored UTC time as "Nominal Local Time" (e.g. 00:00 UTC = 00:00 MYT)
  const getMalaysiaHour = (isoStr: string) => {
    const hasTz = /Z|[+-]\d{2}:\d{2}$/.test(isoStr)
    const t = new Date(hasTz ? isoStr : (isoStr + "Z"))
    if (isNaN(t.getTime())) return -1
    return t.getUTCHours()
  }

  const toDayKey = (t: string) => {
    // Use UTC components to avoid local timezone shifting (e.g. 16:00 UTC should not become next day)
    const hasTz = /Z|[+-]\d{2}:\d{2}$/.test(t)
    const d = new Date(hasTz ? t : (t + "Z"))
    if (isNaN(d.getTime())) return String(t)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  }

  const formatXAxis = (v: string) => {
    const d = new Date(v.includes("T") ? v : v + "T00:00:00")
    if (timePeriod === "weekly") return formatDate(d, "EEE dd").toUpperCase()
    if (timePeriod === "monthly") return formatDate(d, "dd")
    return formatDate(d, "ha")
  }

  const formatTooltipLabel = (v: string) => {
    const d = new Date(v.includes("T") ? v : v + "T00:00:00")
    if (timePeriod === "weekly" || timePeriod === "monthly") {
      return v.includes("T") ? formatDate(d, "PP p") : formatDate(d, "PP")
    }
    return formatTimeHM(v)
  }
  
  const now = new Date()
  // Since we shifted data by +8h on the server, we must also shift "now" by +8h for the check
  // Otherwise, data from "Malaysia Future" (e.g. 11am MYT) looks like "Real Future" compared to "Real UTC Now" (4am UTC)
  const nowShifted = new Date(now.getTime() + (8 * 60 * 60 * 1000))
  const filterFuture = (arr: any[]) => arr.filter(item => new Date(item.time) <= nowShifted)

  const selectedDay = formatDate(currentPeriod, "yyyy-MM-dd")
  const hrSrcRaw = filterFuture(vitals.hr || [])
  const spo2SrcRaw = filterFuture(vitals.spo2 || [])
  const stepsSrcRaw = filterFuture(vitals.steps || [])
  const bpSrcRaw = filterFuture(vitals.bp || [])
  const weightSrcRaw = filterFuture(vitals.weight || [])
  
  const hrSrc = timePeriod === "daily" ? hrSrcRaw.filter((r: any) => toDayKey(r.time) === selectedDay) : hrSrcRaw
  const spo2Src = timePeriod === "daily" ? spo2SrcRaw.filter((r: any) => toDayKey(r.time) === selectedDay) : spo2SrcRaw
  const stepsSrc = timePeriod === "daily" ? stepsSrcRaw.filter((r: any) => toDayKey(r.time) === selectedDay) : stepsSrcRaw
  const bpSrc = timePeriod === "daily" ? bpSrcRaw.filter((r: any) => toDayKey(r.time) === selectedDay) : bpSrcRaw
  const weightSrc = timePeriod === "daily" ? weightSrcRaw.filter((r: any) => toDayKey(r.time) === selectedDay) : weightSrcRaw
  
  const hr = period === "hourly"
    ? (() => {
        const out = []
        const start = startOfDay(currentPeriod)
        const byHour = new Map<number, { min: number[], avg: number[], max: number[] }>()
        hrSrc.forEach((r: any) => {
             const h = getMalaysiaHour(r.time)
             if (h === -1) return
             if (!byHour.has(h)) byHour.set(h, { min: [], avg: [], max: [] })
             const entry = byHour.get(h)!
             if (typeof r.min === "number") entry.min.push(r.min)
             if (typeof r.avg === "number") entry.avg.push(r.avg)
             if (typeof r.max === "number") entry.max.push(r.max)
        })
        const year = currentPeriod.getFullYear()
        const month = currentPeriod.getMonth()
        const date = currentPeriod.getDate()
        for (let i = 0; i < 24; i++) {
             const utcTimestamp = Date.UTC(year, month, date, i - 8, 0, 0)
             const time = new Date(utcTimestamp).toISOString()
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
      })()
    : Object.entries(hrSrc.reduce((acc: Record<string, { min: number[]; avg: number[]; max: number[] }>, r: any) => {
        const k = toDayKey(r.time)
        const o = acc[k] || { min: [], avg: [], max: [] }
        if (typeof r.min === "number") o.min.push(r.min)
        if (typeof r.avg === "number") o.avg.push(r.avg)
        if (typeof r.max === "number") o.max.push(r.max)
        acc[k] = o
        return acc
      }, {})).map(([k, v]: [string, any]) => ({ time: k, min: v.min.length ? Math.min(...v.min) : undefined, avg: v.avg.length ? Math.round(v.avg.reduce((a: number, b: number) => a + b, 0) / v.avg.length) : undefined, max: v.max.length ? Math.max(...v.max) : undefined }))
        .sort((a, b) => new Date(a.time as any).getTime() - new Date(b.time as any).getTime())

  const spo2 = period === "hourly"
    ? (() => {
        const out = []
        const start = startOfDay(currentPeriod)
        const byHour = new Map<number, { min: number[], avg: number[], max: number[] }>()
        spo2Src.forEach((r: any) => {
             const h = getMalaysiaHour(r.time)
             if (h === -1) return
             if (!byHour.has(h)) byHour.set(h, { min: [], avg: [], max: [] })
             const entry = byHour.get(h)!
             if (typeof r.min === "number") entry.min.push(r.min)
             if (typeof r.avg === "number") entry.avg.push(r.avg)
             if (typeof r.max === "number") entry.max.push(r.max)
        })
        const year = currentPeriod.getFullYear()
        const month = currentPeriod.getMonth()
        const date = currentPeriod.getDate()
        for (let i = 0; i < 24; i++) {
             const utcTimestamp = Date.UTC(year, month, date, i - 8, 0, 0)
             const time = new Date(utcTimestamp).toISOString()
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
      })()
    : Object.entries(spo2Src.reduce((acc: Record<string, { min: number[]; avg: number[]; max: number[] }>, r: any) => {
        const k = toDayKey(r.time)
        const o = acc[k] || { min: [], avg: [], max: [] }
        if (typeof r.min === "number") o.min.push(r.min)
        if (typeof r.avg === "number") o.avg.push(r.avg)
        if (typeof r.max === "number") o.max.push(r.max)
        acc[k] = o
        return acc
      }, {})).map(([k, v]: [string, any]) => ({ time: k, min: v.min.length ? Math.min(...v.min) : undefined, avg: v.avg.length ? Math.round(v.avg.reduce((a: number, b: number) => a + b, 0) / v.avg.length) : undefined, max: v.max.length ? Math.max(...v.max) : undefined }))
        .sort((a, b) => new Date(a.time as any).getTime() - new Date(b.time as any).getTime())

  const hrWeeklyPadded = timePeriod === "weekly"
    ? (() => {
        const baseArr = hr.length ? hr : hrSrc
        const monday = startOfWeek(currentPeriod, { weekStartsOn: 1 })
        const byKey = new Map<string, { min?: number; avg?: number; max?: number }>(baseArr.map((d: any) => [String(d.time), { min: d.min, avg: d.avg, max: d.max }]))
        const out: Array<{ time: string; min?: number; avg?: number; max?: number }> = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday)
          d.setDate(monday.getDate() + i)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          const v = byKey.get(k) || {}
          out.push({ time: k, min: v.min, avg: v.avg, max: v.max })
        }
        return out
      })()
    : hr
  const spo2WeeklyPadded = timePeriod === "weekly"
    ? (() => {
        const baseArr = spo2.length ? spo2 : spo2Src
        const monday = startOfWeek(currentPeriod, { weekStartsOn: 1 })
        const byKey = new Map<string, { min?: number; avg?: number; max?: number }>(baseArr.map((d: any) => [String(d.time), { min: d.min, avg: d.avg, max: d.max }]))
        const out: Array<{ time: string; min?: number; avg?: number; max?: number }> = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday)
          d.setDate(monday.getDate() + i)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          const v = byKey.get(k) || {}
          out.push({ time: k, min: v.min, avg: v.avg, max: v.max })
        }
        return out
      })()
    : spo2
  const hrMonthlyPadded = timePeriod === "monthly"
    ? (() => {
        const baseArr = hr.length ? hr : hrSrc
        const y = currentPeriod.getFullYear(); const m = currentPeriod.getMonth()
        const lastDay = new Date(y, m + 1, 0).getDate()
        const byKey = new Map<string, { min?: number; avg?: number; max?: number }>(baseArr.map((d: any) => [String(d.time), { min: d.min, avg: d.avg, max: d.max }]))
        const out: Array<{ time: string; min?: number; avg?: number; max?: number }> = []
        for (let day = 1; day <= lastDay; day++) {
          const d = new Date(y, m, day)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          const v = byKey.get(k) || {}
          out.push({ time: k, min: v.min, avg: v.avg, max: v.max })
        }
        return out
      })()
    : hr
  const spo2MonthlyPadded = timePeriod === "monthly"
    ? (() => {
        const baseArr = spo2.length ? spo2 : spo2Src
        const y = currentPeriod.getFullYear(); const m = currentPeriod.getMonth()
        const lastDay = new Date(y, m + 1, 0).getDate()
        const byKey = new Map<string, { min?: number; avg?: number; max?: number }>(baseArr.map((d: any) => [String(d.time), { min: d.min, avg: d.avg, max: d.max }]))
        const out: Array<{ time: string; min?: number; avg?: number; max?: number }> = []
        for (let day = 1; day <= lastDay; day++) {
          const d = new Date(y, m, day)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          const v = byKey.get(k) || {}
          out.push({ time: k, min: v.min, avg: v.avg, max: v.max })
        }
        return out
      })()
    : spo2
  const stepsDayAgg = timePeriod === "weekly" || timePeriod === "monthly"
    ? Object.entries(stepsSrc.reduce((acc: Record<string, number>, r: any) => {
        const k = toDayKey(r.time)
        acc[k] = (acc[k] || 0) + (typeof r.count === "number" ? r.count : 0)
        return acc
      }, {})).map(([k, v]) => ({ time: k, count: v })).sort((a, b) => new Date(a.time as any).getTime() - new Date(b.time as any).getTime())
      : (() => {
          // Daily padded for steps
          const out = []
          const start = startOfDay(currentPeriod)
          const byHour = new Map<number, number>()
          stepsSrc.forEach((r: any) => {
               const h = getMalaysiaHour(r.time)
               if (h === -1) return
               byHour.set(h, (byHour.get(h) || 0) + (r.count || 0))
          })
          for (let i = 0; i < 24; i++) {
               const d = new Date(start)
               d.setHours(i, 0, 0, 0)
               out.push({ time: d.toISOString(), count: byHour.has(i) ? byHour.get(i) : undefined })
          }
          return out
      })()
  const stepsWeeklyPadded = timePeriod === "weekly"
    ? (() => {
        const monday = startOfWeek(currentPeriod, { weekStartsOn: 1 })
        const byKey = new Map<string, number>(stepsDayAgg.map((d: any) => [String(d.time), d.count]))
        const out: Array<{ time: string; count?: number }> = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday)
          d.setDate(monday.getDate() + i)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          out.push({ time: k, count: byKey.has(k) ? byKey.get(k) : undefined })
        }
        return out
      })()
    : stepsSrc
  const stepsMonthlyPadded = timePeriod === "monthly"
    ? (() => {
        const y = currentPeriod.getFullYear(); const m = currentPeriod.getMonth()
        const first = new Date(y, m, 1)
        const last = new Date(y, m + 1, 0)
        const byKey = new Map<string, number>(stepsDayAgg.map((d: any) => [String(d.time), d.count]))
        const out: Array<{ time: string; count?: number }> = []
        for (let day = 1; day <= last.getDate(); day++) {
          const d = new Date(y, m, day)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          out.push({ time: k, count: byKey.has(k) ? byKey.get(k) : undefined })
        }
        return out
      })()
    : stepsSrc
  const hrForMerge = timePeriod === "weekly" ? hrWeeklyPadded : (timePeriod === "monthly" ? hrMonthlyPadded : hr)
  const spo2ForMerge = timePeriod === "weekly" ? spo2WeeklyPadded : (timePeriod === "monthly" ? spo2MonthlyPadded : spo2)
  const hasHrData = hrForMerge.length > 0
  const hasSpo2Data = spo2ForMerge.length > 0
  const stepsSelected = timePeriod === "weekly" ? stepsWeeklyPadded : (timePeriod === "monthly" ? stepsMonthlyPadded : stepsDayAgg)
  const stepsNums = stepsSelected.map((x: any) => x.count).filter((n: any) => typeof n === "number")
  const stepsMin = stepsNums.length ? Math.min(...stepsNums) : undefined
  const stepsMax = stepsNums.length ? Math.max(...stepsNums) : undefined
  const stepsAvg = stepsNums.length ? Math.round(stepsNums.reduce((a: number, b: number) => a + b, 0) / stepsNums.length) : undefined
  const bpWeeklyPadded = timePeriod === "weekly"
    ? (() => {
        const baseArr = bpSrc
        const monday = startOfWeek(currentPeriod, { weekStartsOn: 1 })
        const byKey = new Map<string, any[]>()
        baseArr.forEach((d: any) => {
          const k = toDayKey(d.time)
          if (!byKey.has(k)) byKey.set(k, [])
          byKey.get(k)!.push(d)
        })
        const out: Array<{ date: string; sys?: number; dia?: number; pulse?: number }> = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday)
          d.setDate(monday.getDate() + i)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          const readings = byKey.get(k) || []
          if (readings.length) {
            const sys = Math.round(readings.reduce((s, r) => s + r.systolic, 0) / readings.length)
            const dia = Math.round(readings.reduce((s, r) => s + r.diastolic, 0) / readings.length)
            const pulse = Math.round(readings.reduce((s, r) => s + r.pulse, 0) / readings.length)
            out.push({ date: k, sys, dia, pulse })
          } else {
            out.push({ date: k, sys: undefined, dia: undefined, pulse: undefined })
          }
        }
        return out
      })()
    : []

  const bpMonthlyPadded = timePeriod === "monthly"
    ? (() => {
        const baseArr = bpSrc
        const y = currentPeriod.getFullYear(); const m = currentPeriod.getMonth()
        const lastDay = new Date(y, m + 1, 0).getDate()
        const byKey = new Map<string, any[]>()
        baseArr.forEach((d: any) => {
          const k = toDayKey(d.time)
          if (!byKey.has(k)) byKey.set(k, [])
          byKey.get(k)!.push(d)
        })
        const out: Array<{ date: string; sys?: number; dia?: number; pulse?: number }> = []
        for (let day = 1; day <= lastDay; day++) {
          const d = new Date(y, m, day)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          const readings = byKey.get(k) || []
          if (readings.length) {
            const sys = Math.round(readings.reduce((s, r) => s + r.systolic, 0) / readings.length)
            const dia = Math.round(readings.reduce((s, r) => s + r.diastolic, 0) / readings.length)
            const pulse = Math.round(readings.reduce((s, r) => s + r.pulse, 0) / readings.length)
            out.push({ date: k, sys, dia, pulse })
          } else {
            out.push({ date: k, sys: undefined, dia: undefined, pulse: undefined })
          }
        }
        return out
      })()
    : []

  const bp = (timePeriod === "weekly" ? bpWeeklyPadded : (timePeriod === "monthly" ? bpMonthlyPadded : bpSrc.map((r: any) => ({ date: r.time, sys: r.systolic, dia: r.diastolic, pulse: r.pulse }))))
  const hasBpData = bp.length > 0

  const weightWeeklyPadded = timePeriod === "weekly"
    ? (() => {
        const baseArr = weightSrc
        const monday = startOfWeek(currentPeriod, { weekStartsOn: 1 })
        const byKey = new Map<string, number>(baseArr.map((d: any) => [toDayKey(d.time), (d.value !== undefined ? d.value : (typeof d.kg === "number" ? d.kg : (typeof d.weight === "number" ? d.weight : undefined)))]))
        const out: Array<{ time: string; value?: number }> = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday)
          d.setDate(monday.getDate() + i)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          out.push({ time: k, value: byKey.get(k) })
        }
        return out
      })()
    : weightSrc

  const weightMonthlyPadded = timePeriod === "monthly"
    ? (() => {
        const baseArr = weightSrc
        const y = currentPeriod.getFullYear(); const m = currentPeriod.getMonth()
        const lastDay = new Date(y, m + 1, 0).getDate()
        const byKey = new Map<string, number>(baseArr.map((d: any) => [toDayKey(d.time), (d.value !== undefined ? d.value : (typeof d.kg === "number" ? d.kg : (typeof d.weight === "number" ? d.weight : undefined)))]))
        const out: Array<{ time: string; value?: number }> = []
        for (let day = 1; day <= lastDay; day++) {
          const d = new Date(y, m, day)
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          out.push({ time: k, value: byKey.get(k) })
        }
        return out
      })()
    : weightSrc

  const weight = (timePeriod === "weekly" ? weightWeeklyPadded : (timePeriod === "monthly" ? weightMonthlyPadded : weightSrc)).map((r: any) => ({
      date: r.time,
      value: r.value !== undefined ? r.value : (typeof r.kg === "number" ? r.kg : (typeof r.weight === "number" ? r.weight : undefined))
  }))
  const hasWeightData = weight.some((r: any) => r.value !== undefined)
  const merged = (hrForMerge.length || spo2ForMerge.length)
    ? (hrForMerge.length >= spo2ForMerge.length
        ? hrForMerge.map((h, i) => ({
            date: h.time,
            heartRate: h.avg,
            heartRateMin: h.min,
            heartRateMax: h.max,
            restingHeartRate: (h as any).resting,
            spo2: spo2ForMerge[i]?.avg,
            spo2Min: spo2ForMerge[i]?.min,
            spo2Max: spo2ForMerge[i]?.max,
          }))
        : spo2ForMerge.map((o, i) => ({
            date: o.time,
            heartRate: hrForMerge[i]?.avg,
            heartRateMin: hrForMerge[i]?.min,
            heartRateMax: hrForMerge[i]?.max,
            restingHeartRate: (hrForMerge[i] as any)?.resting,
            spo2: o.avg,
            spo2Min: o.min,
            spo2Max: o.max,
          })))
    : []

  const getDateRangeLabel = () => {
    const now = new Date()
    if (timePeriod === "daily") {
      if (isYesterday(currentPeriod)) return "Yesterday"
      return formatDate(currentPeriod, "PPPP")
    }
    if (timePeriod === "weekly") {
      const start = startOfWeek(currentPeriod, { weekStartsOn: 1 })
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      if (differenceInCalendarWeeks(now, end) === 1) return "Last week"
      return `${formatDate(start, "PP")} - ${formatDate(end, "PP")}`
    }
    const y = currentPeriod.getFullYear(); const m = currentPeriod.getMonth()
    const end = new Date(y, m + 1, 0)
    if (differenceInCalendarMonths(now, end) === 1) return "Last month"
    return formatDate(end, "LLLL yyyy")
  }

  const handlePrevious = () => {
    if (timePeriod === "daily") setCurrentPeriod(addDays(currentPeriod, -1))
    else if (timePeriod === "weekly") setCurrentPeriod(addWeeks(currentPeriod, -1))
    else setCurrentPeriod(addMonths(currentPeriod, -1))
  }

  const handleNext = () => {
    if (timePeriod === "daily") setCurrentPeriod(addDays(currentPeriod, 1))
    else if (timePeriod === "weekly") setCurrentPeriod(addWeeks(currentPeriod, 1))
    else setCurrentPeriod(addMonths(currentPeriod, 1))
  }

  function calculateStats(key: keyof typeof merged[number]) {
    const dates = merged
      .map((d) => new Date(d.date as any))
      .filter((dt) => !Number.isNaN(dt.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    if (!dates.length) return { min: undefined, max: undefined, avg: undefined }
    let start = startOfDay(currentPeriod)
    let end = endOfDay(start)
    if (timePeriod === "weekly") {
      start = startOfWeek(currentPeriod, { weekStartsOn: 1 })
      end = new Date(start)
      end.setDate(start.getDate() + 6)
    } else if (timePeriod === "monthly") {
      const y = currentPeriod.getFullYear(); const m = currentPeriod.getMonth()
      start = new Date(y, m, 1)
      end = new Date(y, m + 1, 0)
    }
    const nums = merged
      .filter((d) => {
        const dt = new Date(d.date as any)
        return !Number.isNaN(dt.getTime()) && dt.getTime() >= start.getTime() && dt.getTime() <= end.getTime()
      })
      .map((d) => {
        const v = d[key] as any
        return typeof v === "number" ? v : NaN
      })
      .filter((v) => !Number.isNaN(v))
    const min = nums.length ? Math.min(...nums) : undefined
    const max = nums.length ? Math.max(...nums) : undefined
    const avg = nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : undefined
    return { min, max, avg }
  }

  const StatCard: React.FC<{ label: string; value: number | string | undefined; unit?: string }> = ({ label, value, unit }) => (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value ?? "--"}{value !== undefined && unit ? ` ${unit}` : ""}</p>
    </Card>
  )

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-4">Vitals Trend</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Button variant={timePeriod === "daily" ? "default" : "outline"} size="sm" onClick={() => setTimePeriod("daily")}>Daily</Button>
            <Button variant={timePeriod === "weekly" ? "default" : "outline"} size="sm" onClick={() => setTimePeriod("weekly")}>Weekly</Button>
            <Button variant={timePeriod === "monthly" ? "default" : "outline"} size="sm" onClick={() => setTimePeriod("monthly")}>Monthly</Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={handlePrevious} aria-label="Previous period">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[200px] text-center">{getDateRangeLabel()}</span>
            <Button variant="outline" size="icon" onClick={handleNext} aria-label="Next period">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Track your health metrics over time</p>
      </div>
      <div className="space-y-8">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>
        ) : (merged.length || hasWeightData || stepsSelected.length || hasBpData) ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full mb-6 ${timePeriod === "daily" ? "grid-cols-3" : "grid-cols-5"}`}>
              <TabsTrigger value="heartRate">
                <Heart className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Heart Rate</span>
              </TabsTrigger>
              <TabsTrigger value="spo2">
                <Droplet className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">SpO2</span>
              </TabsTrigger>
              {timePeriod !== "daily" && (
                <TabsTrigger value="weight">
                  <Weight className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Weight</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="steps">
                <Footprints className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Steps</span>
              </TabsTrigger>
              {timePeriod !== "daily" && (
                <TabsTrigger value="bloodPressure">
                  <Activity className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Blood Pressure</span>
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="heartRate">
              {hasHrData ? (
              <>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <ComposedChart data={merged} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} tickFormatter={formatXAxis} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} width={30} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d: any = payload[0].payload
                        return (
                          <div className="bg-card border border-border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-2">{formatTooltipLabel(d.date)}</p>
                            <p className="text-sm"><span className="text-chart-1">●</span> Max: {d.heartRateMax ?? "--"} bpm</p>
                            <p className="text-sm"><span className="text-chart-2">●</span> Avg: {d.heartRate ?? "--"} bpm</p>
                            <p className="text-sm"><span className="text-chart-3">●</span> Min: {d.heartRateMin ?? "--"} bpm</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line type="linear" dataKey="heartRateMax" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={isMobile ? false : { fill: "hsl(var(--chart-1))", r: 4, fillOpacity: 0.5 }} connectNulls={false} />
                  <Line type="linear" dataKey="heartRate" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={isMobile ? false : { fill: "hsl(var(--chart-2))", r: 6 }} connectNulls={false} />
                  <Line type="linear" dataKey="heartRateMin" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={isMobile ? false : { fill: "hsl(var(--chart-3))", r: 4, fillOpacity: 0.5 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <StatCard label="Min HR" value={calculateStats("heartRateMin").min} unit="bpm" />
                <StatCard label="Max HR" value={calculateStats("heartRateMax").max} unit="bpm" />
                <StatCard label="Average HR" value={calculateStats("heartRate").avg} unit="bpm" />
                <StatCard label="Resting HR" value={timePeriod === "daily" ? (() => {
                  const hours = (vitals.hr || [])
                  const night = hours
                    .map((r: any) => ({ h: getMalaysiaHour(r.time), avg: r.avg, count: r.count }))
                    .filter((x: any) => x.h >= 0 && x.h <= 6 && (x.count || 0) >= 10)
                    .sort((a: any, b: any) => a.h - b.h)
                  if (!night.length) return undefined
                  let best = { score: Infinity, vals: [] as number[] }
                  for (let i = 0; i < night.length; i++) {
                    const w = [night[i], night[i+1], night[i+2]].filter(Boolean)
                    if (w.length) {
                      const score = w.reduce((s, x) => s + (x.avg || 0), 0) / w.length
                      const vals = w.map(x => x.avg || 0).sort((a,b)=>a-b)
                      const mid = Math.floor(vals.length/2)
                      const median = vals.length % 2 ? vals[mid] : (vals[mid-1]+vals[mid])/2
                      if (score < best.score) best = { score, vals: [median] }
                    }
                  }
                  return best.vals.length ? Math.round(best.vals[0]) : undefined
                })() : calculateStats("restingHeartRate").avg} unit="bpm" />
              </div>
              </>
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">No record</div>
              )}
            </TabsContent>
            <TabsContent value="spo2">
              {hasSpo2Data ? (
              <>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <ComposedChart data={merged} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} tickFormatter={formatXAxis} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} domain={[90, 100]} width={30} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d: any = payload[0].payload
                        return (
                          <div className="bg-card border border-border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-2">{formatTooltipLabel(d.date)}</p>
                            <p className="text-sm"><span className="text-chart-1">●</span> Max: {d.spo2Max ?? "--"}%</p>
                            <p className="text-sm"><span className="text-chart-2">●</span> Avg: {d.spo2 ?? "--"}%</p>
                            <p className="text-sm"><span className="text-chart-3">●</span> Min: {d.spo2Min ?? "--"}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line type="linear" dataKey="spo2Max" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={isMobile ? false : { fill: "hsl(var(--chart-1))", r: 4, fillOpacity: 0.5 }} connectNulls={false} />
                  <Line type="linear" dataKey="spo2" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={isMobile ? false : { fill: "hsl(var(--chart-2))", r: 6 }} connectNulls={false} />
                  <Line type="linear" dataKey="spo2Min" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={isMobile ? false : { fill: "hsl(var(--chart-3))", r: 4, fillOpacity: 0.5 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <StatCard label="Min SpO2" value={calculateStats("spo2Min").min} unit="%" />
                <StatCard label="Max SpO2" value={calculateStats("spo2Max").max} unit="%" />
                <StatCard label="Average SpO2" value={calculateStats("spo2").avg} unit="%" />
              </div>
              </>
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">No record</div>
              )}
            </TabsContent>
            <TabsContent value="weight">
              {hasWeightData ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={weight} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} tickFormatter={formatXAxis} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} domain={['auto', 'auto']} width={30} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))" }} formatter={(value: number) => [`${value} kg`, ""]} labelFormatter={formatTooltipLabel} />
                  <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">No record</div>
              )}
            </TabsContent>
            <TabsContent value="steps">
              {stepsSelected.length ? (
              <>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={stepsSelected.map((s: any) => ({ date: s.time, steps: s.count }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} tickFormatter={formatXAxis} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} width={40} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`${value} steps`, ""]}
                    labelFormatter={formatTooltipLabel}
                  />
                  <Bar dataKey="steps" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <StatCard label="Min Steps" value={stepsMin} />
                <StatCard label="Max Steps" value={stepsMax} />
              <StatCard label="Average Steps" value={stepsAvg} />
              </div>
              </>
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">No record</div>
              )}
            </TabsContent>
            <TabsContent value="bloodPressure">
              {hasBpData ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <ComposedChart data={bp} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} tickFormatter={formatXAxis} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} labelStyle={{ color: "hsl(var(--foreground))" }} formatter={(value: number, name: string) => [`${value}${name === 'pulse' ? ' bpm' : ''}`, name === 'sys' ? 'Systolic' : (name === 'dia' ? 'Diastolic' : 'Pulse')]} labelFormatter={formatTooltipLabel} />
                  <Line type="linear" dataKey="sys" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={isMobile ? false : { fill: "hsl(var(--chart-1))", r: 6 }} connectNulls={false} />
                  <Line type="linear" dataKey="dia" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={isMobile ? false : { fill: "hsl(var(--chart-3))", r: 6 }} connectNulls={false} />
                  <Line type="linear" dataKey="pulse" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={isMobile ? false : { fill: "hsl(var(--chart-2))", r: 6 }} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">No record</div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No record</div>
        )}
      </div>
    </Card>
  )
}

export default VitalsChart
