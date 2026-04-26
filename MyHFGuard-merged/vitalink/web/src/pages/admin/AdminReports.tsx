import { useEffect, useMemo, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
import {
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  HeartPulse,
  Droplets,
  Scale,
  Activity,
  FileText,
} from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"

import { serverUrl } from "@/lib/api"
import { buildAlerts, pickWorstStatus } from "@/lib/adminAlertUtils"

export default function AdminReports() {
  const navigate = useNavigate()
  const API = serverUrl()
  const reportRef = useRef<HTMLDivElement>(null)

  const [summary, setSummary] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    try {
      setLoading(true)
      setError("")

      const patientsRes = await fetch(`${API}/api/admin/patients`)
      if (!patientsRes.ok) throw new Error("Failed to fetch patients")

      const patientsData = await patientsRes.json()
      const patientRows = patientsData.patients || []

      const detailed = await Promise.all(
        patientRows.map(async (patient: any) => {
          const patientId = patient.patient_id

          const [patientInfoRes, summaryRes, vitalsRes, weeklyStatusRes] =
            await Promise.all([
              fetch(`${API}/admin/patient-info?patientId=${patientId}`).then((r) =>
                r.ok ? r.json() : null
              ),
              fetch(`${API}/patient/summary?patientId=${patientId}`).then((r) =>
                r.ok ? r.json() : null
              ),
              fetch(`${API}/patient/vitals?patientId=${patientId}&period=weekly`).then((r) =>
                r.ok ? r.json() : null
              ),
              fetch(`${API}/patient/weekly-status?patientId=${patientId}`).then((r) =>
                r.ok ? r.json() : null
              ),
            ])

          const alerts = buildAlerts({
            patientId,
            summaryData: summaryRes,
            vitalsData: vitalsRes,
            weeklyStatus: weeklyStatusRes,
            demoMode: false,
          })

          return {
            patientId,
            patientInfo: patientInfoRes,
            summaryData: summaryRes,
            vitalsData: vitalsRes,
            weeklyStatus: weeklyStatusRes,
            alerts,
            status: pickWorstStatus(alerts),
          }
        })
      )

      setSummary(detailed)
    } catch (e: any) {
      console.error(e)
      setError(e.message || "Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  async function exportPDF() {
    try {
      if (!reportRef.current) return

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#eef2f7",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "pt", "a4")

      const pageWidth = pdf.internal.pageSize.getWidth()
      const imgWidth = pageWidth - 40
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.setFontSize(16)
      pdf.text("MyHFGuard Admin Report", 20, 25)
      pdf.addImage(imgData, "PNG", 20, 45, imgWidth, imgHeight)

      pdf.save("admin_reports.pdf")
      toast.success("PDF report downloaded")
    } catch (error) {
      console.error(error)
      toast.error("Failed to export PDF")
    }
  }

  const reportData = useMemo(() => {
    let spo2Total = 0
    let spo2Count = 0
    let hrTotal = 0
    let hrCount = 0
    let weightTotal = 0
    let weightCount = 0

    let stable = 0
    let warning = 0
    let critical = 0

    summary.forEach((item) => {
      const vitals = item.vitalsData?.vitals || {}
      const s = item.summaryData?.summary || {}

      const latestSpo2 =
        vitals.spo2?.length > 0
          ? Number(vitals.spo2[vitals.spo2.length - 1]?.avg)
          : null

      const latestWeight =
        vitals.weight?.length > 0
          ? Number(vitals.weight[vitals.weight.length - 1]?.value)
          : null

      const hr = Number(s.heartRate)

      if (!Number.isNaN(latestSpo2) && latestSpo2 && latestSpo2 > 0) {
        spo2Total += latestSpo2
        spo2Count++
      }

      if (!Number.isNaN(hr) && hr > 0) {
        hrTotal += hr
        hrCount++
      }

      if (!Number.isNaN(latestWeight) && latestWeight && latestWeight > 0) {
        weightTotal += latestWeight
        weightCount++
      }

      if (item.status === "critical") critical++
      else if (item.status === "warning") warning++
      else stable++
    })

    return {
      totalPatients: summary.length,
      avgSpo2: spo2Count ? Math.round(spo2Total / spo2Count) : "-",
      avgHeartRate: hrCount ? Math.round(hrTotal / hrCount) : "-",
      avgWeight: weightCount ? (weightTotal / weightCount).toFixed(1) : "-",
      stable,
      warning,
      critical,
    }
  }, [summary])

  function exportExcel() {
    const rows = summary.map((item) => {
      const patient = item.patientInfo?.patient || {}
      const s = item.summaryData?.summary || {}
      const vitals = item.vitalsData?.vitals || {}

      const latestSpo2 =
        vitals.spo2?.length > 0 ? vitals.spo2[vitals.spo2.length - 1]?.avg : ""

      const latestWeight =
        vitals.weight?.length > 0 ? vitals.weight[vitals.weight.length - 1]?.value : ""

      return {
        "Patient ID": item.patientId,
        Name:
          `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
          item.patientId,
        "Heart Rate": s.heartRate ?? "",
        "BP Systolic": s.bpSystolic ?? "",
        "BP Diastolic": s.bpDiastolic ?? "",
        "Steps Today": s.stepsToday ?? "",
        "Latest SpO2": latestSpo2 ?? "",
        "Latest Weight": latestWeight ?? "",
        Status: item.status,
        "Primary Alert": item.alerts?.[0]?.title || "",
        "Alert Detail": item.alerts?.[0]?.message || "",
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, "Admin Reports")
    XLSX.writeFile(wb, "admin_reports_real_data.xlsx")
    toast.success("Excel report downloaded")
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] p-6">
      <button
        onClick={() => navigate("/admin/dashboard")}
        className="mb-5 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        <ArrowLeft size={17} />
        Back to Dashboard
      </button>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics & Reports</h1>
          <p className="text-sm text-slate-500">
            Real patient health data, alerts, vitals and exportable reports.
          </p>
        </div>

        <button
          onClick={exportPDF}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          <FileText size={17} />
          Export PDF
        </button>
        
        <button
          onClick={exportExcel}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          <FileSpreadsheet size={17} />
          Export Excel
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-600">
          {error}
        </div>
      )}

      <div ref={reportRef}>
        {loading ? (
          <div className="flex items-center gap-2 rounded-xl bg-white p-6 text-slate-600">
            <Loader2 className="animate-spin" size={18} />
            Loading real report data...
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-4">
              <ReportCard icon={<Droplets />} title="Average SpO2" value={`${reportData.avgSpo2}%`} />
              <ReportCard icon={<HeartPulse />} title="Average Heart Rate" value={`${reportData.avgHeartRate} bpm`} />
              <ReportCard icon={<Scale />} title="Average Weight" value={`${reportData.avgWeight} kg`} />
              <ReportCard icon={<Activity />} title="Total Patients" value={reportData.totalPatients} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="mb-4 font-bold text-slate-800">Patient Status Overview</h2>
                <div className="space-y-4">
                  <Bar label="Stable Patients" value={reportData.stable} total={reportData.totalPatients} />
                  <Bar label="Warning Patients" value={reportData.warning} total={reportData.totalPatients} />
                  <Bar label="Critical Patients" value={reportData.critical} total={reportData.totalPatients} />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="mb-4 font-bold text-slate-800">Weekly SpO2 Trend</h2>

                <div className="grid h-56 grid-cols-7 items-end gap-3 border-b border-slate-200 px-2">
                  {getWeeklySpo2(summary).map((value, index) => (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div
                        className="w-8 rounded-t-lg bg-blue-500"
                        style={{ height: `${value ? value * 1.8 : 8}px` }}
                      />
                      <span className="text-xs text-slate-500">D{index + 1}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  This chart is calculated from real weekly SpO2 values where available.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 font-bold text-slate-800">Patient Report Table</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">Patient ID</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">SpO2</th>
                      <th className="px-4 py-3 text-left">Heart Rate</th>
                      <th className="px-4 py-3 text-left">BP</th>
                      <th className="px-4 py-3 text-left">Steps</th>
                      <th className="px-4 py-3 text-left">Weight</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {summary.map((item, index) => {
                      const patient = item.patientInfo?.patient || {}
                      const s = item.summaryData?.summary || {}
                      const vitals = item.vitalsData?.vitals || {}

                      const latestSpo2 =
                        vitals.spo2?.length > 0
                          ? vitals.spo2[vitals.spo2.length - 1]?.avg
                          : "-"

                      const latestWeight =
                        vitals.weight?.length > 0
                          ? vitals.weight[vitals.weight.length - 1]?.value
                          : "-"

                      return (
                        <tr key={item.patientId || index} className="border-b">
                          <td className="px-4 py-3">{item.patientId}</td>
                          <td className="px-4 py-3">
                            {`${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "-"}
                          </td>
                          <td className="px-4 py-3">{latestSpo2 === "-" ? "-" : `${latestSpo2}%`}</td>
                          <td className="px-4 py-3">{s.heartRate ? `${s.heartRate} bpm` : "-"}</td>
                          <td className="px-4 py-3">
                            {s.bpSystolic && s.bpDiastolic
                              ? `${s.bpSystolic}/${s.bpDiastolic}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3">{s.stepsToday ?? "-"}</td>
                          <td className="px-4 py-3">{latestWeight === "-" ? "-" : `${latestWeight} kg`}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={item.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ReportCard({ icon, title, value }: any) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

function Bar({ label, value, total }: any) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>

      <div className="h-3 rounded-full bg-slate-100">
        <div className="h-3 rounded-full bg-blue-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: any) {
  const style =
    status === "critical"
      ? "bg-red-100 text-red-700"
      : status === "warning"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700"

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
      {status}
    </span>
  )
}

function getWeeklySpo2(summary: any[]) {
  const dailyTotals = Array(7).fill(0)
  const dailyCounts = Array(7).fill(0)

  summary.forEach((item) => {
    const spo2List = item.vitalsData?.vitals?.spo2 || []

    spo2List.slice(-7).forEach((row: any, index: number) => {
      const value = Number(row.avg)
      if (!Number.isNaN(value) && value > 0) {
        dailyTotals[index] += value
        dailyCounts[index]++
      }
    })
  })

  return dailyTotals.map((total, index) =>
    dailyCounts[index] ? Math.round(total / dailyCounts[index]) : 0
  )
}