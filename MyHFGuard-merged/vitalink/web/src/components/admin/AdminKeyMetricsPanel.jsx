import { Footprints, HeartPulse, Scale, Waves } from "lucide-react"
import AdminWeightChart from "@/components/admin/AdminWeightChart"
import AdminBPChart from "@/components/admin/AdminBPChart"

export default function AdminKeyMetricsPanel({ dashboardData, summary = [] }) {
  const realData = getRealMetrics(summary)

  const avgSpo2 =
    realData.avgSpo2 !== "-" ? realData.avgSpo2 : dashboardData.avgSpo2

  const avgHr =
    realData.avgHr !== "-" ? realData.avgHr : dashboardData.avgHr

  const avgSteps =
    realData.avgSteps !== "-" ? realData.avgSteps : dashboardData.avgSteps

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900 mb-4">Key Metrics</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <MetricCard
          icon={<Waves className="text-cyan-600" size={18} />}
          label="Avg SpO₂"
          value={avgSpo2 === "-" ? "No data" : `${avgSpo2}%`}
        />

        <MetricCard
          icon={<HeartPulse className="text-rose-600" size={18} />}
          label="Avg Heart Rate"
          value={avgHr === "-" ? "No data" : `${avgHr} bpm`}
        />

        <MetricCard
          icon={<Footprints className="text-emerald-600" size={18} />}
          label="Avg Daily Steps"
          value={avgSteps === "-" ? "No data" : avgSteps}
        />

        <MetricCard
          icon={<Scale className="text-blue-600" size={18} />}
          label="Avg Weight"
          value={realData.avgWeight === "-" ? "No data" : `${realData.avgWeight} kg`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <AdminWeightChart summary={summary} compact />
        <AdminBPChart summary={summary} compact />
      </div>
    </section>
  )
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-white p-2">{icon}</div>
        <div>
          <p className="text-xs text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  )
}

function getRealMetrics(summary) {
  let spo2Total = 0
  let spo2Count = 0

  let hrTotal = 0
  let hrCount = 0

  let stepsTotal = 0
  let stepsCount = 0

  let weightTotal = 0
  let weightCount = 0

  summary.forEach((item) => {
    const vitals = item.vitalsData?.vitals || {}
    const s = item.summaryData?.summary || {}

    const spo2List = vitals.spo2 || []
    const weightList = vitals.weight || []

    const latestSpo2 =
      spo2List.length > 0 ? Number(spo2List[spo2List.length - 1]?.avg) : null

    const latestWeight =
      weightList.length > 0 ? Number(weightList[weightList.length - 1]?.value) : null

    const heartRate = Number(s.heartRate)
    const steps = Number(s.stepsToday)

    if (!Number.isNaN(latestSpo2) && latestSpo2 > 0) {
      spo2Total += latestSpo2
      spo2Count++
    }

    if (!Number.isNaN(heartRate) && heartRate > 0) {
      hrTotal += heartRate
      hrCount++
    }

    if (!Number.isNaN(steps) && steps >= 0) {
      stepsTotal += steps
      stepsCount++
    }

    if (!Number.isNaN(latestWeight) && latestWeight > 0) {
      weightTotal += latestWeight
      weightCount++
    }
  })

  return {
    avgSpo2: spo2Count ? Math.round(spo2Total / spo2Count) : "-",
    avgHr: hrCount ? Math.round(hrTotal / hrCount) : "-",
    avgSteps: stepsCount ? Math.round(stepsTotal / stepsCount) : "-",
    avgWeight: weightCount ? (weightTotal / weightCount).toFixed(1) : "-",
  }
}