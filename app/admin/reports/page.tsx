import { requireCostAdmin } from '@/lib/require-cost-admin'
import { createClient } from '@/lib/supabase/server'
import { computeCostReport, type CostReportRow } from '@/lib/cost-report'
import AppHeader from '../../_components/app-header'

function formatMonthLabel(monthStart: string) {
  return new Date(monthStart + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function addMonths(monthStart: string, delta: number) {
  const d = new Date(monthStart + 'T00:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + delta)
  return d.toISOString().slice(0, 7) + '-01'
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  await requireCostAdmin()
  const supabase = await createClient()

  const params = await searchParams
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = params.month ?? today.slice(0, 7) + '-01'

  const report = await computeCostReport(supabase, monthStart)

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader title="Cost Reports" />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-ink rounded-2xl p-5 mb-6 flex items-center justify-between">
          <a
            href={`/admin/reports?month=${addMonths(monthStart, -1)}`}
            className="text-white/60 hover:text-white text-sm px-2"
          >
            ← Prev
          </a>
          <div className="text-center">
            <p className="font-semibold text-white">{formatMonthLabel(monthStart)}</p>
            <p className="text-sm mt-0.5 text-white/70">
              {formatINR(report.totalCost)} total · {report.workingDays} working days
            </p>
          </div>
          <a
            href={`/admin/reports?month=${addMonths(monthStart, 1)}`}
            className="text-white/60 hover:text-white text-sm px-2"
          >
            Next →
          </a>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-slate-400 max-w-md">
            Working days counted as Mon–Fri only — no holiday calendar exists yet, so this
            doesn&apos;t yet account for holidays falling in this month.
          </p>
          <a
            href={`/admin/reports/export?month=${monthStart}`}
            className="text-sm bg-brand-blue text-white rounded-lg px-4 py-2 font-medium whitespace-nowrap ml-4"
          >
            Download Excel
          </a>
        </div>

        {report.missingRateCount > 0 && (
          <div className="text-sm bg-amber-50 text-amber-800 rounded-lg px-4 py-3 mb-6">
            {report.missingRateCount} employee(s) logged time this month but have no cost rate
            on file for this period — their time is excluded from every total below. Set a
            rate for them on the Employees page.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard title="By Project" rows={report.byProject} />
          <ReportCard title="By Department" rows={report.byDepartment} />
          <ReportCard title="By Employee" rows={report.byEmployee} />
        </div>
      </div>
    </main>
  )
}

function ReportCard({ title, rows }: { title: string; rows: CostReportRow[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-ink mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No data for this month.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-ink truncate pr-2">{row.label}</span>
              <span className="text-slate-600 whitespace-nowrap">
                ₹{row.cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
