import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Gates a page to Cost Admin only — stricter than requireAdmin(), which
 * also allows TL/DC. Used for genuinely cost-sensitive pages (rate
 * entry lives inline on the Employees page instead, gated there by a
 * simple role check since TL/DC already has legitimate reasons to be on
 * that page — but a whole page of cost reports has no reason to exist
 * for anyone but Cost Admin at all).
 */
export async function requireCostAdmin() {
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

  if (!employee || !employee.is_active || employee.role !== 'cost_admin') {
    redirect('/')
  }

  return employee
}
