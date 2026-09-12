import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '../_components/app-header'

const roleLabels: Record<string, string> = {
  employee: 'Employee',
  tl_dc: 'TL / DC',
  cost_admin: 'Cost Admin',
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function MyProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: employee } = await supabase
    .from('employees')
    .select('full_name, employee_code, role, date_of_joining, departments(name)')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader title="My Profile" />

      <div className="max-w-sm mx-auto px-6 py-10">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          {employee ? (
            <>
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="text-ink font-medium">{employee.full_name}</p>
              </div>
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
              <div>
                <p className="text-xs text-slate-500">Date of Joining</p>
                <p className="text-ink font-medium">{formatDate(employee.date_of_joining)}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Could not load profile.</p>
          )}

          <a
            href="/profile/change-password"
            className="block text-center bg-brand-blue text-white rounded-lg py-2 font-medium mt-2"
          >
            Change Password
          </a>
        </div>
      </div>
    </main>
  )
}
