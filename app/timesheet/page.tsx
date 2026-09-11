import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AddEntryForm from './add-entry-form'
import AddLeaveForm from './add-leave-form'
import DeleteEntryButton from './delete-entry-button'
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

function formatDisplay(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

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

  const [entriesRes, leaveRes, projectsRes] = await Promise.all([
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
      .select('id, name, is_detailed, tasks(id, name)')
      .eq('is_active', true)
      .order('name'),
  ])

  const entries = entriesRes.data ?? []
  const leave = leaveRes.data
  const projects = (projectsRes.data ?? []).map((p) => ({
    ...p,
    tasks: (p.tasks as { id: number; name: string }[]) ?? [],
  }))

  const workTotal = entries.reduce((sum, e) => sum + Number(e.day_fraction), 0)
  const leaveTotal = leave ? Number(leave.duration) : 0
  const combinedTotal = workTotal + leaveTotal
  const totalColor =
    combinedTotal > 1 ? 'text-red-600' : combinedTotal === 1 ? 'text-brand-teal' : 'text-white/70'

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <a href="/" className="text-sm text-brand-blue">
          Back
        </a>
        <h1 className="text-lg font-bold text-ink mt-1">Log Time</h1>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Date + running total — the one thing that should feel most prominent on this page */}
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
                <div key={`t-${e.id}`} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-ink">
                    {(e.projects as unknown as { name: string } | null)?.name}
                    {e.tasks && (
                      <span className="text-slate-500">
                        {' '}
                        · {(e.tasks as unknown as { name: string } | null)?.name}
                      </span>
                    )}
                    <span className="text-slate-500"> — {Number(e.day_fraction).toFixed(2)} day</span>
                  </span>
                  <DeleteEntryButton id={e.id} action={deleteTimesheetEntry} />
                </div>
              ))}
              {leave && (
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-ink">
                    {leaveTypeLabels[leave.leave_type] ?? leave.leave_type}
                    <span className="text-slate-500"> — {Number(leave.duration).toFixed(2)} day</span>
                  </span>
                  <DeleteEntryButton id={leave.id} action={deleteLeaveEntry} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add work entry */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="font-semibold text-ink mb-4">Log time against a project</h2>
          <AddEntryForm entryDate={entryDate} projects={projects} />
        </div>

        {/* Add leave — only offered if no leave already logged for this day */}
        {!leave && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-ink mb-4">Or mark leave for this day</h2>
            <AddLeaveForm entryDate={entryDate} />
          </div>
        )}
      </div>
    </main>
  )
}
