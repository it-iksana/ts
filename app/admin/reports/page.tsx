import { requireCostAdmin } from '@/lib/require-cost-admin'
import { createClient } from '@/lib/supabase/server'
import { computeCostReport } from '@/lib/cost-report'
import AppHeader from '../../_components/app-header'
import FilterableReportCard from './filterable-report-card'

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

        <p className="text-xs text-slate-400 mb-6">
          Working days: {report.workingDays} (Mon–Fri, minus {report.holidayCount} holiday
          {report.holidayCount === 1 ? '' : 's'} this month).{' '}
          <a href="/admin/holidays" className="text-brand-blue hover:underline">
            Manage holidays
          </a>
          {' · '}
          <a
            href={`/admin/reports/export?month=${monthStart}&type=detail`}
            className="text-brand-blue hover:underline"
          >
            Download: All Data
          </a>
        </p>

        {report.missingRateCount > 0 && (
          <div className="text-sm bg-amber-50 text-amber-800 rounded-lg px-4 py-3 mb-6">
            {report.missingRateCount} employee(s) logged time this month but have no cost rate
            on file for this period — their time is excluded from every total below. Set a
            rate for them on the Employees page.
          </div>
        )}

        <p className="text-xs text-slate-400 mb-2">
          Type to search and select a specific project, department, or employee to download
          its own detailed breakdown.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FilterableReportCard
            title="By Project"
            rows={report.byProject}
            monthStart={monthStart}
            type="project"
          />
          <FilterableReportCard
            title="By Department"
            rows={report.byDepartment}
            monthStart={monthStart}
            type="department"
          />
          <FilterableReportCard
            title="By Employee"
            rows={report.byEmployee}
            monthStart={monthStart}
            type="employee"
          />
        </div>
      </div>
    </main>
  )
}
