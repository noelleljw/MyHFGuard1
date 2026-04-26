import { CircleCheckBig } from "lucide-react"

export default function AdminMonitoringTable({ summary, goToPatient }) {
  return (
    <section className="lg:col-span-7 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-900">Patient Monitoring Table</h2>
        <span className="text-xs text-slate-600">Showing top 5 patients</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="px-3 py-3 text-left">Patient</th>
              <th className="px-3 py-3 text-left">BP</th>
              <th className="px-3 py-3 text-left">Pulse</th>
              <th className="px-3 py-3 text-left">Weight</th>
              <th className="px-3 py-3 text-left">Steps</th>
              <th className="px-3 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {summary.slice(0, 5).map((item) => {
              const patient = item.patientInfo?.patient || {}
              const name =
                `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
                item.patientId

              const s = item.summaryData?.summary || {}
              const latestWeight =
                item.vitalsData?.vitals?.weight &&
                item.vitalsData.vitals.weight.length > 0
                  ? item.vitalsData.vitals.weight[item.vitalsData.vitals.weight.length - 1]?.value
                  : "-"

              return (
                <tr
                  key={item.patientId}
                  className="border-t border-slate-200 cursor-pointer hover:bg-slate-50"
                  onClick={() => goToPatient(item.patientId)}
                >
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800">{name}</div>
                    <div className="text-xs text-slate-500">{item.patientId}</div>
                  </td>

                  <td className="px-3 py-3 text-slate-600">
                    {s.bpSystolic && s.bpDiastolic
                      ? `${s.bpSystolic}/${s.bpDiastolic}`
                      : "-"}
                  </td>

                  <td className="px-3 py-3 text-slate-600">{s.bpPulse ?? "-"}</td>

                  <td className="px-3 py-3 text-slate-600">
                    {latestWeight !== "-" ? `${latestWeight} kg` : "-"}
                  </td>

                  <td className="px-3 py-3 text-slate-600">{s.stepsToday ?? "-"}</td>

                  <td className="px-3 py-3">
                    {item.status === "critical" ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-600">
                        Critical
                      </span>
                    ) : item.status === "warning" ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-600">
                        Warning
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-600">
                        <CircleCheckBig size={12} />
                        Stable
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}