import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '../../_components/app-header'
import NewEmployeeForm from './new-employee-form'
import ResetPasswordButton from './reset-password-button'
import CostRateButton from './cost-rate-button'

const roleLabels: Record<string, string> = {
  employee: 'Employee',
  tl_dc: 'TL / DC',
  cost_admin: 'Cost Admin',
}

export default async function EmployeesPage() {
  const caller = await requireAdmin()
  const supabase = await createClient()
  const isCostAdmin = caller.role === 'cost_admin'

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_code, full_name, role, is_active, departments(name)')
    .order('full_name')

  const { data: departments, error: departmentsError } = await supabase
    .from('departments')
    .select('id, name')
    .order('name')

  // Cost rates are hidden from TL/DC entirely — not even queried for
  // them, on top of the RLS policy that would block it anyway. Empty for
  // anyone but Cost Admin, so the query below is a genuine no-op if this
  // isn't a Cost Admin viewing the page.
  const costRates: Record<string, number> = {}
  if (isCostAdmin) {
    const { data: rates } = await supabase
      .from('current_employee_cost_rates')
      .select('employee_id, monthly_cost')
    for (const r of rates ?? []) {
      costRates[r.employee_id] = Number(r.monthly_cost)
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader title="Employees" />

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
                {isCostAdmin && <th className="px-4 py-2 font-medium">Cost Rate</th>}
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((emp) => (
                <tr key={emp.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-ink">{emp.employee_code}</td>
                  <td className="px-4 py-2 text-ink">{emp.full_name ?? <span className="text-slate-400 italic">Not set</span>}</td>
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
                  {isCostAdmin && (
                    <td className="px-4 py-2 text-right">
                      <CostRateButton employeeId={emp.id} currentRate={costRates[emp.id] ?? null} />
                    </td>
                  )}
                  <td className="px-4 py-2 text-right">
                    <ResetPasswordButton employeeId={emp.id} />
                  </td>
                </tr>
              ))}
              {(!employees || employees.length === 0) && (
                <tr>
                  <td colSpan={isCostAdmin ? 7 : 6} className="px-4 py-6 text-center text-slate-400">
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
