import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { getPatientVitals } from "@/lib/api"
import { formatTimeHM } from "@/lib/utils"
import { Heart, Activity, Footprints, Droplet, Scale, Weight } from "lucide-react"

type Props = { patientId?: string }

const RecentReadings: React.FC<Props> = ({ patientId }) => {
  const { data, isLoading } = useQuery({ queryKey: ["patient-vitals", patientId], queryFn: () => getPatientVitals(patientId), refetchOnWindowFocus: false, enabled: !!patientId })
  const vitals = data?.vitals || {}

  const getIcon = (type: string) => {
    switch (type) {
      case "Heart Rate": return <Heart className="w-5 h-5 text-red-500" />
      case "SpO2": return <Droplet className="w-5 h-5 text-blue-500" />
      case "Steps": return <Footprints className="w-5 h-5 text-green-500" />
      case "Blood Pressure": return <Activity className="w-5 h-5 text-orange-500" />
      case "Weight": return <Weight className="w-5 h-5 text-indigo-500" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  const allReadings = [
    ...(vitals.hr || []).map((r) => ({ type: "Heart Rate", time: r.time, value: `${r.avg} bpm` })),
    ...(vitals.spo2 || []).map((r) => ({ type: "SpO2", time: r.time, value: `${r.avg}%` })),
    ...(vitals.steps || []).map((r) => ({ type: "Steps", time: r.time, value: `${r.count} steps` })),
    // TODO: When BP/weight data available, include:
    // ...(vitals.bp || []).map((r) => ({ type: "Blood Pressure", time: r.time, value: `${r.systolic}/${r.diastolic}` })),
    // ...(vitals.weight || []).map((r) => ({ type: "Weight", time: r.time, value: `${r.kg} kg` })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  const readings = allReadings.reduce((acc, reading) => {
    const existing = acc.find((r) => r.type === reading.type)
    if (!existing) acc.push(reading)
    return acc
  }, [] as typeof allReadings)

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">Recent Readings</h2>
        <p className="text-sm text-muted-foreground">Most recent reading per vital type</p>
      </div>
      
      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : readings.length ? (
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
          {readings.map((r, i) => (
            <div 
              key={i} 
              className={`p-3 border rounded-lg flex flex-col gap-2 ${
                // If it's the last item and the total count is odd, span 2 columns
                (i === readings.length - 1 && readings.length % 2 !== 0) ? "col-span-2" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                {getIcon(r.type)}
                <span className="text-xs text-muted-foreground">{formatTimeHM(r.time)}</span>
              </div>
              <div>
                <div className="text-lg font-bold">{r.value}</div>
                <div className="text-xs text-muted-foreground">{r.type}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground">No recent readings</div>
      )}
    </Card>
  )
}

export default RecentReadings
