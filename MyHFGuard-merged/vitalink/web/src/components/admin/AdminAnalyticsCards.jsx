import { Footprints, HeartPulse, Waves } from "lucide-react"

export default function AdminAnalyticsCards({ dashboardData }) {
  return (
    <div id="analytics-reports" className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-slate-100 p-3">
            <Waves className="text-cyan-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Avg SpO₂</p>
            <p className="text-3xl font-bold text-slate-900">{dashboardData.avgSpo2}%</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-slate-100 p-3">
            <HeartPulse className="text-rose-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Avg Heart Rate</p>
            <p className="text-3xl font-bold text-slate-900">{dashboardData.avgHr} bpm</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-slate-100 p-3">
            <Footprints className="text-emerald-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Avg Daily Steps</p>
            <p className="text-3xl font-bold text-slate-900">{dashboardData.avgSteps}</p>
          </div>
        </div>
      </div>
    </div>
  )
}