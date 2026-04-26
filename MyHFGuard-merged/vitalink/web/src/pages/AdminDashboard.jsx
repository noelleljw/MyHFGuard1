import React, { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
import * as XLSX from "xlsx"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

import { serverUrl } from "@/lib/api"
import { buildAlerts, pickWorstStatus } from "@/lib/adminAlertUtils"

import AdminSidebar from "@/components/admin/AdminSidebar"
import AdminTopBar from "@/components/admin/AdminTopBar"
import AdminRecentAlerts from "@/components/admin/AdminRecentAlerts"
import AdminSummaryPanels from "@/components/admin/AdminSummaryPanels"
import AdminAnalyticsCards from "@/components/admin/AdminAnalyticsCards"
import AdminMonitoringTable from "@/components/admin/AdminMonitoringTable"
import AdminDetailedAlerts from "@/components/admin/AdminDetailedAlerts"
import AdminActivityFeed from "@/components/admin/AdminActivityFeed"
import AdminWeightChart from "@/components/admin/AdminWeightChart"
import AdminBPChart from "@/components/admin/AdminBPChart"
import AdminKeyMetricsPanel from "@/components/admin/AdminKeyMetricsPanel"
import { useNavigate } from "react-router-dom"

export default function AdminDashboard() {
  const navigate = useNavigate()
  const exportRef = useRef(null)

  const [users, setUsers] = useState([])
  const [summary, setSummary] = useState([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState([])
  const [showExportBox, setShowExportBox] = useState(false)

  const API = serverUrl()
  const DEMO_MODE = false

  async function fetchAll() {
    try {
      setLoading(true)
      setError("")

      const p = await fetch(`${API}/api/admin/patients`)
      if (!p.ok) {
        const t = await p.text()
        throw new Error(`patients ${p.status} ${p.statusText} ${t}`)
      }

      const pr = await p.json()
      const patientRows = pr.patients || []
      setUsers(patientRows)

      const detailed = await Promise.all(
        patientRows.map(async (patient, index) => {
          const realPatientId = patient.patient_id

          const demoPatientId =
            DEMO_MODE && index === 0
              ? "demo-critical"
              : DEMO_MODE && index === 1
              ? "demo-warning"
              : realPatientId

          const [patientInfoRes, summaryRes, vitalsRes, weeklyStatusRes, waterSaltRes] =
            await Promise.all([
              fetch(`${API}/admin/patient-info?patientId=${realPatientId}`).then((r) =>
                r.ok ? r.json() : null
              ),
              fetch(`${API}/patient/summary?patientId=${realPatientId}`).then((r) =>
                r.ok ? r.json() : null
              ),
              fetch(`${API}/patient/vitals?patientId=${realPatientId}&period=weekly`).then((r) =>
                r.ok ? r.json() : null
              ),
              fetch(`${API}/patient/weekly-status?patientId=${realPatientId}`).then((r) =>
                r.ok ? r.json() : null
              ),
              supabase
                .from("water_salt_logs")
                .select("*")
                .eq("patient_id", realPatientId)
                .order("entry_date", { ascending: false })
                .limit(1)
                .then(({ data, error }) => (error ? null : data?.[0] || null)),
            ])

          const alerts = buildAlerts({
            patientId: demoPatientId,
            summaryData: summaryRes,
            vitalsData: vitalsRes,
            weeklyStatus: weeklyStatusRes,
            demoMode: DEMO_MODE,
          })

          return {
            patientId: realPatientId,
            patientInfo: patientInfoRes,
            summaryData: summaryRes,
            vitalsData: vitalsRes,
            weeklyStatus: weeklyStatusRes,
            waterSaltLog: waterSaltRes,
            alerts,
            status: pickWorstStatus(alerts),
          }
        })
      )

      detailed.sort((a, b) => {
        const rank = { critical: 0, warning: 1, stable: 2 }
        return rank[a.status] - rank[b.status]
      })

      setSummary(detailed)
    } catch (e) {
      console.error("[AdminDashboard] fetchAll error", e)
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()

    const timer = setInterval(() => {
      fetchAll()
    }, 30000) // every 30 seconds

    return () => clearInterval(timer)
  }, [API])

  const dashboardData = useMemo(() => {
    const totalPatients = users.length
    const activePatients = summary.length

    let avgSpo2 = 0
    let avgHr = 0
    let avgSteps = 0

    let spo2Count = 0
    let hrCount = 0
    let stepsCount = 0

    let stable = 0
    let warning = 0
    let critical = 0

    const alerts = []

    summary.forEach((item) => {
      const latestSpo2 =
        item.vitalsData?.vitals?.spo2 && item.vitalsData.vitals.spo2.length > 0
          ? Number(item.vitalsData.vitals.spo2[item.vitalsData.vitals.spo2.length - 1]?.avg)
          : null

      const hr = Number(item.summaryData?.summary?.heartRate)
      const steps = Number(item.summaryData?.summary?.stepsToday)

      if (!Number.isNaN(latestSpo2) && latestSpo2 > 0) {
        avgSpo2 += latestSpo2
        spo2Count++
      }

      if (!Number.isNaN(hr) && hr > 0) {
        avgHr += hr
        hrCount++
      }

      if (!Number.isNaN(steps) && steps >= 0) {
        avgSteps += steps
        stepsCount++
      }

      if (item.status === "critical") critical++
      else if (item.status === "warning") warning++
      else stable++

      const primaryAlert = item.alerts.find((a) => a.level !== "stable") || item.alerts[0]

      if (
        primaryAlert &&
        !acknowledgedAlerts.includes(`${item.patientId}-${primaryAlert.id}`)
      ) {
        alerts.push({
          id: `${item.patientId}-${primaryAlert.id}`,
          level: primaryAlert.level,
          title: primaryAlert.title,
          patientId: item.patientId,
          message: primaryAlert.message,
        })
      }
    })

    return {
      totalPatients,
      activePatients,
      newThisMonth: users.length,
      avgSpo2: spo2Count ? Math.round(avgSpo2 / spo2Count) : "-",
      avgHr: hrCount ? Math.round(avgHr / hrCount) : "-",
      avgSteps: stepsCount ? Math.round(avgSteps / stepsCount) : "-",
      stable,
      warning,
      critical,
      alerts,
    }
  }, [users, summary, acknowledgedAlerts])

  const exportExcel = () => {
    const rows = summary.map((item) => {
      const patient = item.patientInfo?.patient || {}
      const s = item.summaryData?.summary || {}
      const latestSpo2 =
        item.vitalsData?.vitals?.spo2 && item.vitalsData.vitals.spo2.length > 0
          ? item.vitalsData.vitals.spo2[item.vitalsData.vitals.spo2.length - 1]?.avg
          : ""

      const latestWeight =
        item.vitalsData?.vitals?.weight && item.vitalsData.vitals.weight.length > 0
          ? item.vitalsData.vitals.weight[item.vitalsData.vitals.weight.length - 1]?.value
          : ""

      return {
        "Patient ID": item.patientId,
        "First Name": patient.first_name || "",
        "Last Name": patient.last_name || "",
        "Date of Birth": patient.dob || "",
        "Heart Rate": s.heartRate ?? "",
        "BP Systolic": s.bpSystolic ?? "",
        "BP Diastolic": s.bpDiastolic ?? "",
        "Pulse": s.bpPulse ?? "",
        "Steps Today": s.stepsToday ?? "",
        "Distance Today": s.distanceToday ?? "",
        "Latest SpO2": latestSpo2 ?? "",
        "Latest Weight": latestWeight ?? "",
        Status: item.status,
        "Primary Alert": item.alerts?.[0]?.title || "",
        "Alert Detail": item.alerts?.[0]?.message || "",
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Admin Dashboard")
    XLSX.writeFile(wb, "admin_dashboard_report.xlsx")
    toast.success("Excel file downloaded")
  }

  const exportPDF = async () => {
    try {
      if (!exportRef.current) return

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#eef2f7",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "pt", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth - 40
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 20

      pdf.setFontSize(16)
      pdf.text("MyHFGuard Admin Dashboard Report", 20, 20)
      pdf.addImage(imgData, "PNG", 20, 40, imgWidth, imgHeight)
      heightLeft -= pageHeight - 40

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 40
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save("admin_dashboard_report.pdf")
      toast.success("PDF downloaded")
    } catch (e) {
      console.error(e)
      toast.error("Failed to export PDF")
    }
  }

  const acknowledgeAlert = (alertId) => {
    setAcknowledgedAlerts((prev) => [...prev, alertId])
    toast.success("Alert acknowledged")
  }

  const sendAlertEmail = (alert) => {
    const row = summary.find((x) => x.patientId === alert.patientId)
    const patient = row?.patientInfo?.patient || {}

    const patientName =
      `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || alert.patientId

    const subject = encodeURIComponent(`MyHFGuard Alert - ${patientName}`)
    const body = encodeURIComponent(
      [
        `Patient: ${patientName}`,
        `Patient ID: ${alert.patientId}`,
        `Alert Level: ${alert.level.toUpperCase()}`,
        `Alert: ${alert.title}`,
        `Details: ${alert.message}`,
      ].join("\n")
    )

    window.location.href = `mailto:?subject=${subject}&body=${body}`
    toast.success(`Email draft opened for patient ${alert.patientId}`)
  }

  const goToPatient = (patientId) => {
    navigate(`/admin/patient/${patientId}`, {
      state: { from: "/admin/dashboard" },
    })
  }

  const alertsToShow = dashboardData.alerts.slice(0, 6)

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="flex min-h-screen" ref={exportRef}>
        <AdminSidebar />

        <main className="flex-1 p-5">
          <div className="mx-auto max-w-7xl">
            <AdminTopBar
              showExportBox={showExportBox}
              setShowExportBox={setShowExportBox}
              exportPDF={exportPDF}
              exportExcel={exportExcel}
              onRefresh={fetchAll}
            />

            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-xl bg-white border border-slate-200 p-8 shadow-sm text-slate-700 flex items-center gap-3">
                <Loader2 className="animate-spin" size={18} />
                Loading dashboard...
              </div>
            ) : (
              <>
                {/* Main dashboard layout */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {/* Recent Alerts */}
                  <AdminRecentAlerts
                    alertsToShow={alertsToShow}
                    acknowledgeAlert={acknowledgeAlert}
                    goToPatient={goToPatient}
                    sendAlertEmail={sendAlertEmail}
                    summary={summary}
                  />

                  {/* Overall Status */}
                  <AdminSummaryPanels dashboardData={dashboardData} />
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {/* Activity Feeds */}
                  <AdminActivityFeed summary={summary} />

                  {/* Key Metrics */}
                  <AdminKeyMetricsPanel dashboardData={dashboardData} summary={summary} />
                </div>

                <div className="mt-5">
                  <AdminAnalyticsCards dashboardData={dashboardData} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
} // update