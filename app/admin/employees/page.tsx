import { Users } from 'lucide-react'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import NewEmployeeForm from './new-employee-form'

const roleLabels: Record<string, string> = {
  employee: 'Employee',
  tl_dc: 'TL / DC',
  cost_admin: 'Cost Admin',
}

export default async function EmployeesPage() {
  const caller = await requireAdmin()
  const supabase = await createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name, role, is_active, departments(name)')
    .order('full_name')

  const { data: departments, error: departmentsError } = await supabase
    .from('departments')
    .select('id, name')
    .order('name')

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <a href="/" className="text-sm text-brand-blue">Back</a>
        <div className="flex items-center gap-2 mt-1">
          <Users className="w-5 h-5 text-brand-teal" strokeWidth={1.75} />
          <h1 className="text-lg font-bold text-ink">Employees</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-ink mb-4">Add an employee</h2>
          {departmentsError && (
            <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3 mb-4">
              Couldn&apos;t load departments ({departmentsError.message}) — the
              department field below won&apos;t work correctly until this is
              fixed. This is a real error, not an empty list.
            </div>
          )}
          <NewEmployeeForm departments={departments ?? []} callerRole={caller.role} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Department</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((emp) => (
                <tr key={emp.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-ink">{emp.employee_code}</td>
                  <td className="px-4 py-2 text-ink">{emp.full_name}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {(emp.departments as unknown as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{roleLabels[emp.role] ?? emp.role}</td>
                  <td className="px-4 py-2">
                    {emp.is_active ? (
                      <span className="text-brand-teal">Active</span>
                    ) : (
                      <span className="text-slate-400">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!employees || employees.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No employees yet — add the first one above.
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
