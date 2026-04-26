import { useMemo, useState } from "react"
import { Bell, CircleAlert, Mail, TriangleAlert, ChevronDown, ChevronUp } from "lucide-react"

export default function AdminRecentAlerts({
  alertsToShow,
  acknowledgeAlert,
  goToPatient,
  sendAlertEmail,
  summary = [],
}) {
  const [expanded, setExpanded] = useState(false)

  const visibleAlerts = useMemo(() => {
    return expanded ? alertsToShow : alertsToShow.slice(0, 4)
  }, [expanded, alertsToShow])

  const getPatientName = (patientId) => {
    const row = summary.find((item) => item.patientId === patientId)
    const patient = row?.patientInfo?.patient || {}

    return (
      `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
      patient.full_name ||
      patient.name ||
      patientId
    )
  }

  return (
    <section
      id="recent-alerts"
      className="lg:col-span-5 rounded-xl bg-white border border-slate-200 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-800">Recent Alerts</h2>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Bell size={14} />
          {alertsToShow.length} alerts
        </div>
      </div>

      <div className="space-y-3">
        {alertsToShow.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            No active alerts found.
          </div>
        ) : (
          <>
            {visibleAlerts.map((alert) => {
              const patientName = getPatientName(alert.patientId)

              return (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-3 ${
                    alert.level === "critical"
                      ? "border-red-200 bg-red-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {alert.level === "critical" ? (
                      <TriangleAlert className="text-red-500 mt-0.5" size={16} />
                    ) : (
                      <CircleAlert className="text-amber-500 mt-0.5" size={16} />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-800">
                        {alert.title}: {patientName}
                      </p>

                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Patient ID: {alert.patientId}
                      </p>

                      <p className="text-xs text-slate-600 mt-1">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                    >
                      Acknowledge
                    </button>

                    <button
                      onClick={() => goToPatient(alert.patientId)}
                      className="rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-400"
                    >
                      View Profile
                    </button>

                    <button
                      onClick={() => sendAlertEmail(alert)}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      <Mail size={12} />
                      Send Email
                    </button>
                  </div>
                </div>
              )
            })}

            {alertsToShow.length > 4 && (
              <button
                onClick={() => setExpanded((prev) => !prev)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {expanded ? (
                  <>
                    <ChevronUp size={16} />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    View More Alerts
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}