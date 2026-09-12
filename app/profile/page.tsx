import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '../_components/app-header'
import ProfileForm from './profile-form'

const roleLabels: Record<string, string> = {
  employee: 'Employee',
  tl_dc: 'TL / DC',
  cost_admin: 'Cost Admin',
}

export default async function MyProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: employee } = await supabase
    .from('employees')
    .select('full_name, employee_code, role, address, personal_email, departments(name)')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader title="My Profile" />

      <div className="max-w-sm mx-auto px-6 py-10">
        {employee ? (
          <>
            {/* Admin-set, read-only here — these affect access and
                reporting, not something an employee edits themselves */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 space-y-3">
              <div>
                <p className="text-xs text-slate-500">Employee Code</p>
                <p className="text-ink font-medium">{employee.employee_code}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="text-ink font-medium">
                  {roleLabels[employee.role] ?? employee.role}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Department</p>
                <p className="text-ink font-medium">
                  {(employee.departments as unknown as { name: string } | null)?.name ?? '—'}
                </p>
              </div>
            </div>

            {/* Employee-editable */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <ProfileForm
                employee={{
                  full_name: employee.full_name,
                  address: employee.address,
                  personal_email: employee.personal_email,
                }}
              />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-400">Could not load profile.</p>
          </div>
        )}

        <a
          href="/profile/change-password"
          className="block text-center text-sm text-brand-blue mt-4"
        >
          Change Password
        </a>
      </div>
    </main>
  )
}
