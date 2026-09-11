import { redirect } from 'next/navigation'
import { Clock, FolderKanban, Users, Building2, BarChart3 } from 'lucide-react'
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

  if (!user) {
    redirect('/login')
  }

  const { data: employee, error } = await supabase
    .from('employees')
    .select('full_name, employee_code, role')
    .eq('id', user.id)
    .single()

  if (error || !employee) {
    await supabase.auth.signOut()
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper px-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-sm font-semibold text-brand-blue mb-1">iKSANA</p>
          <h1 className="text-2xl font-bold text-ink mb-6">Timesheet</h1>
          <div className="text-sm bg-amber-50 text-amber-800 rounded-lg px-4 py-3 mb-4">
            This account doesn&apos;t currently have access. If this seems
            wrong, contact an admin.
          </div>
          <a href="/login" className="text-sm text-brand-blue">
            Back to login
          </a>
        </div>
      </main>
    )
  }

  const isAdmin = employee.role === 'tl_dc' || employee.role === 'cost_admin'

  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-brand-blue">iKSANA</p>
          <h1 className="text-lg font-bold text-ink">Timesheet</h1>
        </div>
        <SignOutButton />
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-sm text-slate-500">Welcome back</p>
          <h2 className="text-2xl font-bold text-ink">{employee.full_name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {employee.employee_code} &nbsp;·&nbsp; {roleLabels[employee.role] ?? employee.role}
          </p>
        </div>

        {/* Primary daily action — visually dominant, everything else is secondary */}
        <a
          href="/timesheet"
          className="group flex items-center gap-4 bg-brand-blue hover:bg-[#1d6390] transition-colors rounded-2xl p-6 mb-4"
        >
          <div className="shrink-0 bg-white/15 rounded-xl p-3">
            <Clock className="w-7 h-7 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Log time</p>
            <p className="text-sm text-white/80">Record work or leave for a day</p>
          </div>
        </a>

        {isAdmin && (
          <>
            <p className="text-xs font-medium text-slate-400 mt-8 mb-3">Administration</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <AdminBox
                href="/admin/projects"
                icon={<FolderKanban className="w-5 h-5" strokeWidth={1.75} />}
                label="Projects & tasks"
              />
              <AdminBox
                href="/admin/employees"
                icon={<Users className="w-5 h-5" strokeWidth={1.75} />}
                label="Employees"
              />
              <AdminBox
                href="/admin/departments"
                icon={<Building2 className="w-5 h-5" strokeWidth={1.75} />}
                label="Departments"
              />
            </div>
          </>
        )}

        {employee.role === 'cost_admin' && (
          <div className="mt-3 flex items-center gap-3 bg-white border border-dashed border-slate-300 rounded-xl p-4 text-slate-400">
            <BarChart3 className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-sm flex-1">Cost & billing reports</span>
            <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">Coming soon</span>
          </div>
        )}
      </div>
    </main>
  )
}

function AdminBox({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-start gap-3 bg-white border border-slate-200 hover:border-brand-blue hover:shadow-sm transition-all rounded-xl p-4"
    >
      <div className="text-brand-teal">{icon}</div>
      <span className="text-sm font-medium text-ink">{label}</span>
    </a>
  )
}
