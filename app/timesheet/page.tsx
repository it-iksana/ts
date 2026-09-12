import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AddEntryForm from './add-entry-form'
import AddLeaveForm from './add-leave-form'
import DeleteEntryButton from './delete-entry-button'
import MyTasks from './my-tasks'
import TotalsWidget from './totals-widget'
import LeaveCounter from './leave-counter'
import { deleteTimesheetEntry, deleteLeaveEntry } from './actions'

const leaveTypeLabels: Record<string, string> = {
  L: 'Leave',
  SL: 'Sick Leave',
  CL: 'Casual Leave',
  CO: 'Comp-off',
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Monday of the week containing this date. getUTCDay() is 0=Sunday..6=Saturday;
// this maps it so Monday is always the start regardless of where the given
// date falls in its own week.
function mondayOf(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  const dayOfWeek = d.getUTCDay()
  const daysSinceMonday = (dayOfWeek + 6) % 7
  return addDays(iso, -daysSinceMonday)
}

function firstOfMonth(iso: string) {
  return iso.slice(0, 7) + '-01'
}

function firstOfYear(iso: string) {
  return iso.slice(0, 4) + '-01-01'
}

function lastOfYear(iso: string) {
  return iso.slice(0, 4) + '-12-31'
}

function formatDisplay(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const entryDate = params.date ?? todayIso()
  const weekStart = mondayOf(entryDate)
  const weekEnd = addDays(weekStart, 4)

  // "Till date" totals and the leave counter always reflect today's real
  // standing, independent of whatever date is currently being navigated
  // to for entry purposes — these are status widgets, not tied to
  // entryDate the way the rest of the page is.
  const today = todayIso()
  const weekToDateStart = mondayOf(today)
  const monthToDateStart = firstOfMonth(today)
  const yearStart = firstOfYear(today)
  const yearEnd = lastOfYear(today)

  const [
    entriesRes,
    leaveRes,
    projectsRes,
    weekEntriesRes,
    weekLeaveRes,
    myTasksRes,
    weekToDateEntriesRes,
    weekToDateLeaveRes,
    monthToDateEntriesRes,
    monthToDateLeaveRes,
    yearLeaveRes,
  ] = await Promise.all([
      supabase
        .from('timesheet_entries')
        .select('id, day_fraction, projects(name), tasks(name)')
        .eq('employee_id', user.id)
        .eq('entry_date', entryDate)
        .order('id'),
      supabase
        .from('leave_entries')
        .select('id, leave_type, duration')
        .eq('employee_id', user.id)
        .eq('entry_date', entryDate)
        .maybeSingle(),
      supabase
        .from('projects')
        .select('id, name, is_detailed, tasks(id, name, due_date)')
        .eq('is_active', true)
        .order('name'),
      // Whole Mon–Fri range for the "This Week" overview below — separate
      // from the single-day queries above, which stay scoped to entryDate.
      supabase
        .from('timesheet_entries')
        .select('entry_date, day_fraction')
        .eq('employee_id', user.id)
        .gte('entry_date', weekStart)
        .lte('entry_date', weekEnd),
      supabase
        .from('leave_entries')
        .select('entry_date, duration')
        .eq('employee_id', user.id)
        .gte('entry_date', weekStart)
        .lte('entry_date', weekEnd),
      // Tasks assigned to this employee, regardless of date — shown as
      // "Assigned to you" below, separate from the day-specific sections.
      supabase
        .from('tasks')
        .select('id, name, status, due_date, projects(name)')
        .eq('assigned_to', user.id)
        .order('name'),
      // Week-to-date and month-to-date totals — today's real week/month,
      // summed only through today, not projected forward.
      supabase
        .from('timesheet_entries')
        .select('day_fraction')
        .eq('employee_id', user.id)
        .gte('entry_date', weekToDateStart)
        .lte('entry_date', today),
      supabase
        .from('leave_entries')
        .select('duration')
        .eq('employee_id', user.id)
        .gte('entry_date', weekToDateStart)
        .lte('entry_date', today),
      supabase
        .from('timesheet_entries')
        .select('day_fraction')
        .eq('employee_id', user.id)
        .gte('entry_date', monthToDateStart)
        .lte('entry_date', today),
      supabase
        .from('leave_entries')
        .select('duration')
        .eq('employee_id', user.id)
        .gte('entry_date', monthToDateStart)
        .lte('entry_date', today),
      // Leave counter — whole current year, so both the month and year
      // figures can be derived from one query without fetching twice.
      supabase
        .from('leave_entries')
        .select('entry_date, duration')
        .eq('employee_id', user.id)
        .gte('entry_date', yearStart)
        .lte('entry_date', yearEnd),
    ])

  const entries = entriesRes.data ?? []
  const leave = leaveRes.data
  const myTasks = (myTasksRes.data ?? []).map((t) => ({
    ...t,
    projects: t.projects as unknown as { name: string } | null,
  }))
  const projects = (projectsRes.data ?? []).map((p) => ({
    ...p,
    tasks: (p.tasks as { id: number; name: string; due_date: string | null }[]) ?? [],
  }))

  // Per-day totals for the week overview — work and leave combined, same
  // as the single-day total above, just for all five days at once.
  const weekTotals: Record<string, number> = {}
  for (const e of weekEntriesRes.data ?? []) {
    weekTotals[e.entry_date] = (weekTotals[e.entry_date] ?? 0) + Number(e.day_fraction)
  }
  for (const l of weekLeaveRes.data ?? []) {
    weekTotals[l.entry_date] = (weekTotals[l.entry_date] ?? 0) + Number(l.duration)
  }
  const weekDays = WEEKDAY_LABELS.map((label, i) => {
    const date = addDays(weekStart, i)
    return { label, date, total: weekTotals[date] ?? 0 }
  })

  const workTotal = entries.reduce((sum, e) => sum + Number(e.day_fraction), 0)
  const leaveTotal = leave ? Number(leave.duration) : 0
  const combinedTotal = workTotal + leaveTotal
  const totalColor =
    combinedTotal > 1 ? 'text-red-600' : combinedTotal === 1 ? 'text-brand-teal' : 'text-white/70'

  // Week-to-date / month-to-date — work and leave combined, same
  // combining logic as the single-day total above.
  const weekToDateTotal =
    (weekToDateEntriesRes.data ?? []).reduce((sum, e) => sum + Number(e.day_fraction), 0) +
    (weekToDateLeaveRes.data ?? []).reduce((sum, l) => sum + Number(l.duration), 0)
  const monthToDateTotal =
    (monthToDateEntriesRes.data ?? []).reduce((sum, e) => sum + Number(e.day_fraction), 0) +
    (monthToDateLeaveRes.data ?? []).reduce((sum, l) => sum + Number(l.duration), 0)

  // Leave counter — the year-scoped query covers both figures; the month
  // count is just the subset of those rows whose date starts with the
  // current year-month prefix, no second query needed.
  const yearLeaveRows = yearLeaveRes.data ?? []
  const leaveThisYear = yearLeaveRows.reduce((sum, l) => sum + Number(l.duration), 0)
  const leaveThisMonth = yearLeaveRows
    .filter((l) => l.entry_date.startsWith(monthToDateStart.slice(0, 7)))
    .reduce((sum, l) => sum + Number(l.duration), 0)

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <a href="/" className="text-sm text-brand-blue">
            Back
          </a>
          <h1 className="text-lg font-bold text-ink mt-1">Log Time</h1>
        </div>
        {/* Profile placeholder — visual only for now, no menu/account page
            built yet. Flagged clearly rather than wired to nothing. */}
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm font-medium">
          {user.email?.[0]?.toUpperCase() ?? '?'}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
          {/* LEFT — assigned tasks, then week/month totals */}
          <div className="space-y-6 order-2 lg:order-1">
            <MyTasks tasks={myTasks} />
            <TotalsWidget weekTotal={weekToDateTotal} monthTotal={monthToDateTotal} />
          </div>

          {/* MIDDLE — unchanged main flow */}
          <div className="order-1 lg:order-2">
            {/* Date + running total — the one thing that should feel most
                prominent on this page */}
            <div className="bg-ink rounded-2xl p-5 mb-6 flex items-center justify-between">
              <a
                href={`/timesheet?date=${addDays(entryDate, -1)}`}
                className="text-white/60 hover:text-white text-sm px-2"
              >
                ← Prev
              </a>
              <div className="text-center">
                <p className="font-semibold text-white">{formatDisplay(entryDate)}</p>
                <p className={`text-sm mt-0.5 ${totalColor}`}>
                  {combinedTotal.toFixed(2)} / 1.00 day logged
                </p>
              </div>
              <a
                href={`/timesheet?date=${addDays(entryDate, 1)}`}
                className="text-white/60 hover:text-white text-sm px-2"
              >
                Next →
              </a>
            </div>

            {/* Existing entries — data rows, not another card */}
            {(entries.length > 0 || leave) && (
              <div className="mb-6">
                <p className="text-xs font-medium text-slate-400 mb-2">Logged for this day</p>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {entries.map((e) => (
                    <div
                      key={`t-${e.id}`}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <span className="text-ink">
                        {(e.projects as unknown as { name: string } | null)?.name}
                        {e.tasks && (
                          <span className="text-slate-500">
                            {' '}
                            · {(e.tasks as unknown as { name: string } | null)?.name}
                          </span>
                        )}
                        <span className="text-slate-500">
                          {' '}
                          — {Number(e.day_fraction).toFixed(2)} day
                        </span>
                      </span>
                      <DeleteEntryButton id={e.id} action={deleteTimesheetEntry} />
                    </div>
                  ))}
                  {leave && (
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="text-ink">
                        {leaveTypeLabels[leave.leave_type] ?? leave.leave_type}
                        <span className="text-slate-500">
                          {' '}
                          — {Number(leave.duration).toFixed(2)} day
                        </span>
                      </span>
                      <DeleteEntryButton id={leave.id} action={deleteLeaveEntry} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Log time against a project — full width now that leave has
                moved to the right sidebar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-8">
              <h2 className="font-semibold text-ink mb-4">Log time against a project</h2>
              <AddEntryForm entryDate={entryDate} projects={projects} />
            </div>

            {/* This week — at-a-glance status for Mon–Fri, doubles as quick navigation */}
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">This week</p>
              <div className="grid grid-cols-5 gap-2">
                {weekDays.map((day) => {
                  const isViewing = day.date === entryDate
                  const isFull = day.total >= 1
                  const isPartial = day.total > 0 && day.total < 1
                  return (
                    <a
                      key={day.date}
                      href={`/timesheet?date=${day.date}`}
                      className={`rounded-xl p-3 text-center border transition-colors ${
                        isFull
                          ? 'bg-brand-teal border-brand-teal text-white'
                          : isPartial
                            ? 'bg-brand-teal/10 border-brand-teal/30 text-ink'
                            : 'bg-white border-slate-200 text-slate-400'
                      } ${isViewing ? 'ring-2 ring-brand-blue ring-offset-2 ring-offset-paper' : ''}`}
                    >
                      <p className="text-xs font-medium">{day.label}</p>
                      <p className="text-xs mt-0.5 opacity-80">
                        {new Date(day.date + 'T00:00:00Z').getUTCDate()}
                      </p>
                      <p className="text-sm font-semibold mt-1.5">{day.total.toFixed(2)}</p>
                    </a>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — leave counter, then apply leave */}
          <div className="space-y-6 order-3">
            <LeaveCounter monthTotal={leaveThisMonth} yearTotal={leaveThisYear} />
            {!leave && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-ink mb-4">Apply Leave</h2>
                <AddLeaveForm entryDate={entryDate} />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
