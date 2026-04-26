import { Activity, UserCircle } from "lucide-react"

export default function AdminActivityFeed({ summary = [] }) {
  const feedItems = buildFeedItems(summary)

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-cyan-600" />
        <h2 className="font-semibold text-slate-900">Activity Feed</h2>
      </div>

      <div className="space-y-3">
        {feedItems.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No recent user activity.
          </div>
        ) : (
          feedItems.slice(0, 8).map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <UserCircle size={22} />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {item.message}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.detail}
                  </p>
                </div>
              </div>

              <span className="text-xs text-slate-500 whitespace-nowrap">
                {item.time}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function buildFeedItems(summary) {
  const items = []

  summary.forEach((item) => {
    const patient = item.patientInfo?.patient || {}

    const name =
      `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
      patient.full_name ||
      patient.name ||
      item.patientId

    const s = item.summaryData?.summary || {}
    const vitals = item.vitalsData?.vitals || {}
    const waterSalt = item.waterSaltLog

    const latestWeight =
      vitals.weight?.length > 0
        ? vitals.weight[vitals.weight.length - 1]
        : null

    const latestSpo2 =
      vitals.spo2?.length > 0
        ? vitals.spo2[vitals.spo2.length - 1]
        : null

    const bpSys = s.bpSystolic
    const bpDia = s.bpDiastolic
    const hr = s.heartRate
    const steps = s.stepsToday

    if (waterSalt) {
      items.push({
        message: `${name} submitted water intake record`,
        detail: `Water intake: ${waterSalt.water_intake_ml} ml, Status: ${formatStatus(
          waterSalt.water_status
        )}`,
        time: getActivityTime(waterSalt),
        rawTime: getRawTime(waterSalt),
      })

      items.push({
        message: `${name} submitted low salt diet record`,
        detail: `Salt score: ${waterSalt.salt_score}/9, Status: ${formatStatus(
          waterSalt.salt_status
        )}`,
        time: getActivityTime(waterSalt),
        rawTime: getRawTime(waterSalt),
      })
    }

    if (latestWeight?.value) {
      items.push({
        message: `${name} submitted weight log`,
        detail: `Latest weight: ${latestWeight.value} kg`,
        time: getActivityTime(latestWeight),
        rawTime: getRawTime(latestWeight),
      })
    }

    if (bpSys && bpDia) {
      items.push({
        message: `${name} updated blood pressure reading`,
        detail: `BP ${bpSys}/${bpDia} mmHg${hr ? `, Heart Rate ${hr} bpm` : ""}`,
        time: getActivityTime(s),
        rawTime: getRawTime(s),
      })
    }

    if (latestSpo2?.avg) {
      items.push({
        message: `${name} synced SpO₂ data`,
        detail: `Latest SpO₂: ${latestSpo2.avg}%`,
        time: getActivityTime(latestSpo2),
        rawTime: getRawTime(latestSpo2),
      })
    }

    if (steps !== undefined && steps !== null) {
      items.push({
        message: `${name} synced smartband step count`,
        detail: `Today steps: ${steps}`,
        time: getActivityTime(s),
        rawTime: getRawTime(s),
      })
    }

    if (item.status === "critical") {
      items.push({
        message: `${name} triggered a critical alert`,
        detail: item.alerts?.[0]?.message || "Critical condition detected",
        time: getActivityTime(s),
        rawTime: getRawTime(s),
      })
    }
  })

  return items.sort((a, b) => {
    const timeA = a.rawTime ? new Date(a.rawTime).getTime() : 0
    const timeB = b.rawTime ? new Date(b.rawTime).getTime() : 0
    return timeB - timeA
  })

  function getRawTime(data) {
    return (
      data?.updated_at ||
      data?.created_at ||
      data?.timestamp ||
      data?.recorded_at ||
      data?.entry_date ||
      null
    )
  }

  function getActivityTime(data) {
    const time = getRawTime(data)

    if (!time) return "recently"

    const diffMs = Date.now() - new Date(time).getTime()
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return "just now"
    if (diffMin < 60) return `${diffMin} mins ago`

    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr} hours ago`

    const diffDay = Math.floor(diffHr / 24)
    return `${diffDay} days ago`
  }

  function formatStatus(status) {
    if (!status) return "-"
    if (status === "green") return "Within range"
    if (status === "orange") return "Slightly above range"
    if (status === "red") return "Exceeded range"
    return status
  }
}