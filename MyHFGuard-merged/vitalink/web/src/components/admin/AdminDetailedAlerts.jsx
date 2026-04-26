import { CircleAlert, CircleCheckBig, TriangleAlert, UserRound } from "lucide-react"
import {
  getAlertCardClass,
  getStatusBadgeClass,
} from "@/lib/adminAlertUtils"
import { useNavigate } from "react-router-dom"

export default function AdminDetailedAlerts({ summary }) {
  const navigate = useNavigate()
  return (
    <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
      <button
        onClick={() => navigate("/admin/dashboard")}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
        ← Back to Dashboard
      </button>

      <div className="flex items-center gap-2 mb-4">
        <UserRound size={18} className="text-cyan-600" />
        <h2 className="font-semibold text-slate-800">Detailed Patient Alerts</h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {summary.map((item) => {
          const patient = item.patientInfo?.patient || {}
          const name =
            `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
            item.patientId

          return (
            <div
              key={item.patientId}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{name}</h3>
                  <p className="text-xs text-slate-500">{item.patientId}</p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusBadgeClass(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>

              <div className="space-y-2">
                {item.alerts.map((alert) => (
                  <div
                    key={`${item.patientId}-${alert.id}`}
                    className={`rounded-lg border p-3 ${getAlertCardClass(alert.level)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {alert.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {alert.message}
                        </p>
                      </div>

                      {alert.level === "critical" ? (
                        <TriangleAlert size={16} className="text-red-500 mt-0.5" />
                      ) : alert.level === "warning" ? (
                        <CircleAlert size={16} className="text-amber-500 mt-0.5" />
                      ) : (
                        <CircleCheckBig size={16} className="text-emerald-500 mt-0.5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}