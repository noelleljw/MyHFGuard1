import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export default function AdminBPChart({ summary, compact = false }) {
  const firstPatientWithBP = summary.find(
    (item) => item?.vitalsData?.vitals?.bp && item.vitalsData.vitals.bp.length > 0
  )

  const patient = firstPatientWithBP?.patientInfo?.patient || {}
  const patientName =
    `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
    firstPatientWithBP?.patientId ||
    "No patient"

  const data =
    firstPatientWithBP?.vitalsData?.vitals?.bp?.map((item) => ({
      time: item.time,
      systolic: item.systolic,
      diastolic: item.diastolic,
      pulse: item.pulse,
    })) || []

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-1">Blood Pressure Trend</h3>
      <p className="text-xs text-slate-500 mb-3">{patientName}</p>

      <div className={compact ? "h-48" : "h-64"}>
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-lg bg-white text-sm text-slate-500">
            No blood pressure data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="systolic" strokeWidth={2} />
              <Line type="monotone" dataKey="diastolic" strokeWidth={2} />
              <Line type="monotone" dataKey="pulse" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}