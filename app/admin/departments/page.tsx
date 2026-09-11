import { Building2 } from 'lucide-react'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import NewDepartmentForm from './new-department-form'

export default async function DepartmentsPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: departments, error } = await supabase
    .from('departments')
    .select('id, name, employees(count)')
    .order('name')

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <a href="/" className="text-sm text-brand-blue">Back</a>
        <div className="flex items-center gap-2 mt-1">
          <Building2 className="w-5 h-5 text-brand-teal" strokeWidth={1.75} />
          <h1 className="text-lg font-bold text-ink">Departments</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-ink mb-4">Add a department</h2>
          <NewDepartmentForm />
        </div>

        {error && (
          <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4">
            Couldn&apos;t load departments ({error.message}).
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Employees</th>
              </tr>
            </thead>
            <tbody>
              {(departments ?? []).map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-ink">{d.name}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {(d.employees as unknown as { count: number }[])?.[0]?.count ?? 0}
                  </td>
                </tr>
              ))}
              {(!departments || departments.length === 0) && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                    No departments yet — add the first one above.
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
