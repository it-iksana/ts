import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Gates a page to TL/DC and Cost Admin only — sends anyone else back to
 * the home page rather than showing them an admin screen that would just
 * error out against RLS anyway. Returns the current user's own employee
 * record, since every admin page needs it regardless (for display, or for
 * further role checks like Cost Admin-only sections).
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('id, full_name, employee_code, role, is_active')
    .eq('id', user.id)
    .single()

  if (
    !employee ||
    !employee.is_active ||
    (employee.role !== 'tl_dc' && employee.role !== 'cost_admin')
  ) {
    redirect('/')
  }

  return employee
}
