import { Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react"

export default function AdminTopBar({
  showExportBox,
  setShowExportBox,
  exportPDF,
  exportExcel,
  onRefresh,
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-4xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Monitor alerts, patient status, clinical data and reports.
        </p>
      </div>

      <div className="flex items-center gap-2 relative">
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-700 font-semibold hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>

        <button
          onClick={() => setShowExportBox((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-white font-semibold hover:bg-slate-600 shadow-sm"
        >
          <Download size={16} />
          Export Data
        </button>

        {showExportBox && (
          <div className="absolute right-0 top-12 z-20 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
            <h3 className="font-semibold text-slate-900">Export Data</h3>
            <p className="text-sm text-slate-500 mb-3">Choose export format</p>

            <div className="space-y-2">
              <button
                onClick={exportPDF}
                className="w-full flex items-center gap-2 rounded-lg bg-red-500 px-4 py-3 text-white font-medium hover:bg-red-400"
              >
                <FileText size={16} />
                Download as PDF
              </button>

              <button
                onClick={exportExcel}
                className="w-full flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-white font-medium hover:bg-emerald-500"
              >
                <FileSpreadsheet size={16} />
                Download as Excel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}