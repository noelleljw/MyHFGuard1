import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export default function AdminWeightChart({ summary, compact = false }) {
  const firstPatientWithWeight = summary.find(
    (item) => item?.vitalsData?.vitals?.weight && item.vitalsData.vitals.weight.length > 0
  )

  const patient = firstPatientWithWeight?.patientInfo?.patient || {}
  const patientName =
    `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
    firstPatientWithWeight?.patientId ||
    "No patient"

  const data =
    firstPatientWithWeight?.vitalsData?.vitals?.weight?.map((item) => ({
      time: item.time,
      value: item.value,
    })) || []

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-1">Weight Trend</h3>
      <p className="text-xs text-slate-500 mb-3">{patientName}</p>

      <div className={compact ? "h-48" : "h-64"}>
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-lg bg-white text-sm text-slate-500">
            No weight data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}