export function formatNumber(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback
  const n = Number(value)
  return Number.isNaN(n) ? fallback : n
}

export function formatDate(value) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export function formatShortDate(value) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString()
}

export function getStatusBadgeClass(status) {
  if (status === "critical") {
    return "bg-red-100 text-red-700 border border-red-200"
  }
  if (status === "warning") {
    return "bg-amber-100 text-amber-700 border border-amber-200"
  }
  return "bg-emerald-100 text-emerald-700 border border-emerald-200"
}

export function getAlertCardClass(level) {
  if (level === "critical") {
    return "border-red-200 bg-red-50"
  }
  if (level === "warning") {
    return "border-amber-200 bg-amber-50"
  }
  return "border-emerald-200 bg-emerald-50"
}

export function pickWorstStatus(alerts) {
  if (alerts.some((a) => a.level === "critical")) return "critical"
  if (alerts.some((a) => a.level === "warning")) return "warning"
  return "stable"
}

export function buildAlerts({
  patientId,
  summaryData,
  vitalsData,
  weeklyStatus,
  demoMode = false,
}) {
  const alerts = []

  const hr = formatNumber(summaryData?.summary?.heartRate, null)
  const bpSystolic = formatNumber(summaryData?.summary?.bpSystolic, null)
  const bpDiastolic = formatNumber(summaryData?.summary?.bpDiastolic, null)
  const bpPulse = formatNumber(summaryData?.summary?.bpPulse, null)
  const stepsToday = formatNumber(summaryData?.summary?.stepsToday, null)

  const latestSpo2 =
    vitalsData?.vitals?.spo2 && vitalsData.vitals.spo2.length > 0
      ? formatNumber(vitalsData.vitals.spo2[vitalsData.vitals.spo2.length - 1]?.avg, null)
      : null

  const weightSeries =
    vitalsData?.vitals?.weight?.map((w) => ({
      time: w.time,
      value: Number(w.value),
    })) || []

  const latestWeight =
    weightSeries.length > 0 ? weightSeries[weightSeries.length - 1]?.value : null

  // Optional demo mode for presentation
  if (demoMode) {
    if (patientId === "demo-critical") {
      alerts.push({
        id: "demo-critical",
        level: "critical",
        title: "Critical BP / Pulse",
        message: "BP 182/121 mmHg, Pulse 124 bpm",
      })
    }

    if (patientId === "demo-warning") {
      alerts.push({
        id: "demo-warning",
        level: "warning",
        title: "Weight Above Baseline",
        message: "Weight increased 3.5 kg above baseline",
      })
    }
  }

  // BP + pulse alert logic
  if (bpSystolic !== null && bpDiastolic !== null && bpPulse !== null) {
    if (
      bpSystolic >= 180 ||
      bpSystolic < 80 ||
      bpDiastolic >= 120 ||
      bpDiastolic < 50 ||
      bpPulse < 50 ||
      bpPulse > 120
    ) {
      alerts.push({
        id: "bp-critical",
        level: "critical",
        title: "Critical BP / Pulse",
        message: `BP ${bpSystolic}/${bpDiastolic} mmHg, Pulse ${bpPulse} bpm`,
      })
    } else if (
      (bpSystolic >= 140 && bpSystolic <= 179) ||
      (bpDiastolic >= 90 && bpDiastolic <= 119)
    ) {
      alerts.push({
        id: "bp-warning-high",
        level: "warning",
        title: "High Blood Pressure",
        message: `BP ${bpSystolic}/${bpDiastolic} mmHg`,
      })
    } else if (
      (bpSystolic >= 121 && bpSystolic <= 139) ||
      (bpDiastolic >= 80 && bpDiastolic <= 89)
    ) {
      alerts.push({
        id: "bp-warning-elevated",
        level: "warning",
        title: "Elevated Blood Pressure",
        message: `BP ${bpSystolic}/${bpDiastolic} mmHg`,
      })
    }
  }

  // HR logic
  if (hr !== null) {
    if (hr < 50 || hr > 120) {
      alerts.push({
        id: "hr-critical",
        level: "critical",
        title: "Critical Heart Rate",
        message: `Heart rate ${hr} bpm`,
      })
    } else if (hr < 60 || hr > 100) {
      alerts.push({
        id: "hr-warning",
        level: "warning",
        title: "Heart Rate Out of Range",
        message: `Heart rate ${hr} bpm`,
      })
    }
  }

  // SpO2 logic
  if (latestSpo2 !== null) {
    if (latestSpo2 < 90) {
      alerts.push({
        id: "spo2-critical",
        level: "critical",
        title: "Low SpO₂",
        message: `SpO₂ ${latestSpo2}%`,
      })
    } else if (latestSpo2 < 95) {
      alerts.push({
        id: "spo2-warning",
        level: "warning",
        title: "Borderline SpO₂",
        message: `SpO₂ ${latestSpo2}%`,
      })
    }
  }

  // Weight trend logic
  if (weightSeries.length >= 2) {
    const sorted = [...weightSeries].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    )

    const latest = sorted[sorted.length - 1]?.value
    const previous = sorted[sorted.length - 2]?.value

    if (latest != null && previous != null) {
      const diff1 = latest - previous
      if (diff1 >= 1.5) {
        alerts.push({
          id: "weight-warning-1",
          level: "warning",
          title: "Rapid Weight Gain",
          message: `Weight increased ${diff1.toFixed(1)} kg since previous reading`,
        })
      }
    }

    if (sorted.length >= 3) {
      const diff2 = latest - sorted[sorted.length - 3]?.value
      if (!Number.isNaN(diff2) && diff2 >= 3) {
        alerts.push({
          id: "weight-critical-2",
          level: "critical",
          title: "Significant Weight Gain",
          message: `Weight increased ${diff2.toFixed(1)} kg over recent readings`,
        })
      }
    }

    if (sorted.length >= 6) {
      const diff5 = latest - sorted[Math.max(0, sorted.length - 6)]?.value
      if (!Number.isNaN(diff5) && diff5 >= 2) {
        alerts.push({
          id: "weight-warning-5",
          level: "warning",
          title: "Weight Gain Trend",
          message: `Weight increased ${diff5.toFixed(1)} kg over several days`,
        })
      }
    }
  }

  // Baseline comparison if available
  const baselineWeight = formatNumber(summaryData?.summary?.baselineWeight, null)
  const baselineSystolic = formatNumber(summaryData?.summary?.baselineSystolic, null)
  const baselineHr = formatNumber(summaryData?.summary?.baselineHr, null)

  if (baselineWeight !== null && latestWeight !== null) {
    const weightDiff = latestWeight - baselineWeight
    if (weightDiff >= 5) {
      alerts.push({
        id: "baseline-weight-critical",
        level: "critical",
        title: "Weight Far Above Baseline",
        message: `Weight is ${weightDiff.toFixed(1)} kg above baseline`,
      })
    } else if (weightDiff >= 3) {
      alerts.push({
        id: "baseline-weight-warning",
        level: "warning",
        title: "Weight Above Baseline",
        message: `Weight is ${weightDiff.toFixed(1)} kg above baseline`,
      })
    }
  }

  if (baselineSystolic !== null && bpSystolic !== null) {
    const sysDiff = bpSystolic - baselineSystolic
    if (sysDiff >= 20) {
      alerts.push({
        id: "baseline-bp-warning",
        level: "warning",
        title: "Systolic BP Above Baseline",
        message: `Systolic BP is ${sysDiff} mmHg above baseline`,
      })
    }
  }

  if (baselineHr !== null && hr !== null) {
    const hrDiff = Math.abs(hr - baselineHr)
    if (hrDiff >= 20) {
      alerts.push({
        id: "baseline-hr-warning",
        level: "warning",
        title: "Heart Rate Deviates From Baseline",
        message: `Heart rate differs from baseline by ${hrDiff} bpm`,
      })
    }
  }

  // Low activity
  if (stepsToday !== null && stepsToday < 3000) {
    alerts.push({
      id: "steps-warning",
      level: "warning",
      title: "Low Daily Steps",
      message: `Only ${stepsToday} steps recorded today`,
    })
  }

  // Missing self-check logs
  if (weeklyStatus) {
    const days = Object.values(weeklyStatus)
    const missingWeightDays = days.filter((d) => !d.has_weight).length
    const missingSymptomDays = days.filter((d) => !d.has_symptoms).length

    if (missingWeightDays >= 4) {
      alerts.push({
        id: "missing-weight",
        level: "warning",
        title: "Incomplete Weight Logs",
        message: `${missingWeightDays} days without weight log this week`,
      })
    }

    if (missingSymptomDays >= 4) {
      alerts.push({
        id: "missing-symptoms",
        level: "warning",
        title: "Incomplete Symptom Logs",
        message: `${missingSymptomDays} days without symptom log this week`,
      })
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "stable",
      level: "stable",
      title: "Stable",
      message: "No major warning signs found",
    })
  }

  return alerts
}