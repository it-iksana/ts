import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MenuDropdown from './menu-dropdown'
import ProfileDropdown from './profile-dropdown'

export default async function AppHeader({ title }: { title: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Every page using this already has its own auth check too (middleware,
  // plus each page's own requireAdmin() or getUser() call) — this is a
  // defensive fallback, not the real protection mechanism, same pattern
  // used everywhere else in this app.
  if (!user) redirect('/login')

  const { data: employee } = await supabase
    .from('employees')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = employee?.role === 'tl_dc' || employee?.role === 'cost_admin'
  const isCostAdmin = employee?.role === 'cost_admin'
  const initial = user.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <MenuDropdown isAdmin={isAdmin} isCostAdmin={isCostAdmin} />
        <h1 className="text-lg font-bold text-ink">{title}</h1>
      </div>
      <ProfileDropdown initial={initial} />
    </header>
  )
}
