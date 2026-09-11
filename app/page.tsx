import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './sign-out-button'

const roleLabels: Record<string, string> = {
  employee: 'Employee',
  tl_dc: 'TL / DC',
  cost_admin: 'Cost Admin',
}

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already redirects unauthenticated visitors to /login, so
  // this is just a defensive fallback, not the real protection mechanism.
  if (!user) {
    redirect('/login')
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .select('full_name, employee_code, role')
    .eq('id', user.id)
    .single()

  // No accessible employee record — either none was ever linked, or (after
  // the is_active fix) this account has been deactivated. RLS blocks the
  // row either way, so there's no way to tell which from here — and for
  // this message, it doesn't need to: either way, this session shouldn't
  // continue to exist. Signing out here closes the loop properly, rather
  // than leaving someone in a technically-blocked-but-still-logged-in
  // limbo indefinitely.
  if (error || !employee) {
    await supabase.auth.signOut()
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-sky-700 uppercase mb-1">
            iKSANA
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Timesheet</h1>
          <div className="text-sm bg-amber-50 text-amber-800 rounded-md px-4 py-3 mb-4">
            This account doesn&apos;t currently have access. If this seems
            wrong, contact an admin.
          </div>
          <a href="/login" className="text-sm text-sky-700">
            ← Back to login
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-sky-700 uppercase">
            iKSANA
          </p>
          <h1 className="text-lg font-bold text-slate-900">Timesheet</h1>
        </div>
        <SignOutButton />
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <p className="text-sm text-slate-500">Welcome back,</p>
          <h2 className="text-2xl font-bold text-slate-900">
            {employee.full_name}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {employee.employee_code} · {roleLabels[employee.role] ?? employee.role}
          </p>
        </div>

        <nav className="grid gap-3">
          <div className="bg-white rounded-xl shadow p-4 text-slate-400 flex items-center justify-between">
            <span>Log time</span>
            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-1">
              Coming soon
            </span>
          </div>
          {(employee.role === 'tl_dc' || employee.role === 'cost_admin') && (
            <>
              <a
                href="/admin/projects"
                className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow font-medium text-slate-900"
              >
                Manage projects & tasks →
              </a>
              <a
                href="/admin/employees"
                className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow font-medium text-slate-900"
              >
                Manage employees →
              </a>
            </>
          )}
          {employee.role === 'cost_admin' && (
            <div className="bg-white rounded-xl shadow p-4 text-slate-400 flex items-center justify-between">
              <span>Cost & billing reports</span>
              <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-1">
                Coming soon
              </span>
            </div>
          )}
        </nav>
      </div>
    </main>
  )
}
