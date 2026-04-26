export default function AdminSummaryPanels({ dashboardData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <section className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Overall Status</h2>

        <div className="flex flex-col items-center">
          <div className="relative h-36 w-36 rounded-full bg-[conic-gradient(#22c55e_0deg,#22c55e_220deg,#f59e0b_220deg,#f59e0b_300deg,#ef4444_300deg,#ef4444_360deg)] p-4">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-center">
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {dashboardData.totalPatients}
                </p>
                <p className="text-sm text-slate-600">Patients</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 w-full">
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="font-bold text-emerald-700 text-lg">{dashboardData.stable}</p>
              <p className="text-sm text-slate-700">Stable</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-center">
              <p className="font-bold text-amber-700 text-lg">{dashboardData.warning}</p>
              <p className="text-sm text-slate-700">Warning</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3 text-center">
              <p className="font-bold text-red-700 text-lg">{dashboardData.critical}</p>
              <p className="text-sm text-slate-700">Critical</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Patient Summary</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-700">Total Patients</span>
            <span className="font-bold text-slate-900">{dashboardData.totalPatients}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-700">New This Month</span>
            <span className="font-bold text-slate-900">{dashboardData.newThisMonth}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-700">Active Patients</span>
            <span className="font-bold text-slate-900">{dashboardData.activePatients}</span>
          </div>
        </div>
      </section>
    </div>
  )
}