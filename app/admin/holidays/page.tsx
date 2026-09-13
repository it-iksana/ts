import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '../../_components/app-header'
import NewHolidayForm from './new-holiday-form'
import DeleteEntryButton from '../../timesheet/delete-entry-button'
import { deleteHoliday } from './actions'

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function HolidaysPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: holidays, error } = await supabase
    .from('holidays')
    .select('id, holiday_date, name')
    .order('holiday_date')

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader title="Holidays" />

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-ink mb-4">Add a holiday</h2>
          <NewHolidayForm />
        </div>

        {error && (
          <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4">
            Couldn&apos;t load holidays ({error.message}).
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(holidays ?? []).map((h) => (
                <tr key={h.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-ink">{formatDate(h.holiday_date)}</td>
                  <td className="px-4 py-2 text-ink">{h.name}</td>
                  <td className="px-4 py-2 text-right">
                    <DeleteEntryButton id={h.id} action={deleteHoliday} />
                  </td>
                </tr>
              ))}
              {(!holidays || holidays.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    No holidays recorded yet — add the first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
