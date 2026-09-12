import { requireCostAdmin } from '@/lib/require-cost-admin'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '../../_components/app-header'

function countWorkingDays(monthStart: string, monthEnd: string): number {
  // Mon–Fri only. No holiday calendar exists yet, so this doesn't
  // account for holidays — a known, deliberate simplification, not an
  // oversight. Flagged clearly on the page itself too.
  let count = 0
  const d = new Date(monthStart + 'T00:00:00Z')
  const end = new Date(monthEnd + 'T00:00:00Z')
  while (d <= end) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) count++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return count
}

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
  const monthEndDate = new Date(monthStart + 'T00:00:00Z')
  monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1)
  monthEndDate.setUTCDate(0)
  const monthEnd = monthEndDate.toISOString().slice(0, 10)

  const workingDays = countWorkingDays(monthStart, monthEnd)

  const [employeesRes, ratesRes, entriesRes] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, employee_code, department_id, departments(name)'),
    // Every rate effective on or before this month's end — not just
    // "current" — so a report for a past month uses whatever rate was
    // actually in effect then, not today's rate.
    supabase
      .from('employee_cost_rates')
      .select('employee_id, monthly_cost, effective_from')
      .lte('effective_from', monthEnd)
      .order('effective_from', { ascending: true }),
    supabase
      .from('timesheet_entries')
      .select('employee_id, project_id, day_fraction, projects(name)')
      .gte('entry_date', monthStart)
      .lte('entry_date', monthEnd),
  ])

  const employees = employeesRes.data ?? []
  const entries = entriesRes.data ?? []

  // The applicable rate per employee for this specific month: the latest
  // effective_from that's still <= this month's end. Rates are already
  // ordered ascending, so the last match per employee is the right one.
  const rateByEmployee = new Map<string, number>()
  for (const r of ratesRes.data ?? []) {
    rateByEmployee.set(r.employee_id, Number(r.monthly_cost))
  }

  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const costByProject = new Map<string, number>()
  const costByDepartment = new Map<string, number>()
  const costByEmployee = new Map<string, number>()
  const missingRateFor = new Set<string>()

  for (const entry of entries) {
    const rate = rateByEmployee.get(entry.employee_id)
    if (rate === undefined) {
      missingRateFor.add(entry.employee_id)
      continue
    }
    const dailyRate = rate / workingDays
    const cost = dailyRate * Number(entry.day_fraction)

    const projectName =
      (entry.projects as unknown as { name: string } | null)?.name ?? 'Unknown project'
    costByProject.set(projectName, (costByProject.get(projectName) ?? 0) + cost)

    const employee = employeeById.get(entry.employee_id)
    const deptName =
      (employee?.departments as unknown as { name: string } | null)?.name ?? 'No department'
    costByDepartment.set(deptName, (costByDepartment.get(deptName) ?? 0) + cost)

    const employeeLabel = employee?.full_name ?? employee?.employee_code ?? entry.employee_id
    costByEmployee.set(employeeLabel, (costByEmployee.get(employeeLabel) ?? 0) + cost)
  }

  const totalCost = [...costByProject.values()].reduce((a, b) => a + b, 0)

  const rows = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1])

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
              {formatINR(totalCost)} total · {workingDays} working days
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
          Working days counted as Mon–Fri only — no holiday calendar exists yet, so this
          doesn&apos;t yet account for holidays falling in this month.
        </p>

        {missingRateFor.size > 0 && (
          <div className="text-sm bg-amber-50 text-amber-800 rounded-lg px-4 py-3 mb-6">
            {missingRateFor.size} employee(s) logged time this month but have no cost rate on
            file for this period — their time is excluded from every total below. Set a rate
            for them on the Employees page.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard title="By Project" rows={rows(costByProject)} />
          <ReportCard title="By Department" rows={rows(costByDepartment)} />
          <ReportCard title="By Employee" rows={rows(costByEmployee)} />
        </div>
      </div>
    </main>
  )
}

function ReportCard({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-ink mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No data for this month.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(([label, cost]) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span className="text-ink truncate pr-2">{label}</span>
              <span className="text-slate-600 whitespace-nowrap">
                ₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
