import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { serverUrl } from "@/lib/api"

export default function AdminAlerts() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const API = serverUrl()

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/api/admin/patients`)

      if (!res.ok) throw new Error("Failed to fetch alerts")

      const data = await res.json()

      // Simple mock alerts (can connect real later)
      const allAlerts = (data.patients || []).map((p: any) => ({
        id: p.patient_id,
        name: `${p.first_name} ${p.last_name}`,
        level: Math.random() > 0.7 ? "critical" : Math.random() > 0.4 ? "warning" : "info",
        message:
          Math.random() > 0.5
            ? "Abnormal heart rate detected"
            : "Weight fluctuation observed",
      }))

      setAlerts(allAlerts)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const getColor = (level: string) => {
    if (level === "critical") return "bg-red-100 text-red-700 border-red-200"
    if (level === "warning") return "bg-yellow-100 text-yellow-700 border-yellow-200"
    return "bg-blue-100 text-blue-700 border-blue-200"
  }

  return (
    <div className="p-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/admin/dashboard")}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        ← Back to Dashboard
      </button>

      {/* Title */}
      <h1 className="text-2xl font-bold mb-4">Alert Center</h1>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg border">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="animate-spin" size={18} />
          Loading alerts...
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-xl p-4 flex justify-between items-center ${getColor(
                alert.level
              )}`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} />
                <div>
                  <p className="font-semibold">
                    {alert.level.toUpperCase()} — {alert.name}
                  </p>
                  <p className="text-sm">{alert.message}</p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/admin/patient/${alert.id}`)}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
              >
                View Patient
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}