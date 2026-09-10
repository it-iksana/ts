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
        {error || !employee ? (
          <div className="bg-amber-50 text-amber-800 rounded-md px-4 py-3 text-sm">
            You&apos;re signed in, but there&apos;s no employee record linked
            to this account yet. Ask an admin to set one up.
          </div>
        ) : (
          <>
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
              <a
                href="/timesheet"
                className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow font-medium text-slate-900"
              >
                Log time →
              </a>
              {(employee.role === 'tl_dc' || employee.role === 'cost_admin') && (
                <a
                  href="/admin/projects"
                  className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow font-medium text-slate-900"
                >
                  Manage projects, tasks & people →
                </a>
              )}
              {employee.role === 'cost_admin' && (
                <a
                  href="/admin/reports"
                  className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow font-medium text-slate-900"
                >
                  Cost & billing reports →
                </a>
              )}
            </nav>
          </>
        )}
      </div>
    </main>
  )
}
