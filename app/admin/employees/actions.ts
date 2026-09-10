'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { employeeCodeToInternalEmail } from '@/lib/auth'

export type CreateEmployeeResult = { success: true } | { success: false; error: string }

export async function createEmployee(formData: FormData): Promise<CreateEmployeeResult> {
  // Re-check the caller is actually an admin server-side, even though the
  // page itself is already gated — a Server Action is a real network
  // endpoint on its own, callable directly, not just reachable by clicking
  // a button on a page that happens to check first.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not signed in.' }
  }
  const { data: caller } = await supabase
    .from('employees')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!caller || (caller.role !== 'tl_dc' && caller.role !== 'cost_admin')) {
    return { success: false, error: 'Not authorized to add employees.' }
  }

  const employeeCode = String(formData.get('employee_code') ?? '').trim()
  const fullName = String(formData.get('full_name') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const role = String(formData.get('role') ?? 'employee')
  const departmentId = formData.get('department_id') ? Number(formData.get('department_id')) : null
  const dateOfJoining = String(formData.get('date_of_joining') ?? '')

  if (!employeeCode || !fullName || !password || !dateOfJoining) {
    return { success: false, error: 'Employee code, name, password, and joining date are all required.' }
  }
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' }
  }

  const admin = createAdminClient()

  // Step 1: create the actual login.
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: employeeCodeToInternalEmail(employeeCode),
    password,
    email_confirm: true, // internal address, never actually verified by email
  })

  if (authError || !authUser.user) {
    // Supabase's own error mentions "email" — translate it back to what
    // the admin actually typed in, same reasoning as the login page.
    const message = authError?.message?.includes('already been registered')
      ? `Employee code "${employeeCode}" is already in use.`
      : authError?.message ?? 'Could not create the login.'
    return { success: false, error: message }
  }

  // Step 2: create the employee record itself, linked to that login.
  const { error: employeeError } = await supabase.from('employees').insert({
    id: authUser.user.id,
    employee_code: employeeCode,
    full_name: fullName,
    role,
    department_id: departmentId,
    date_of_joining: dateOfJoining,
  })

  if (employeeError) {
    // The login was created but the employee row wasn't — clean up rather
    // than leave an orphaned auth account with no matching record, which
    // would otherwise sit there invisibly and quietly break things later.
    await admin.auth.admin.deleteUser(authUser.user.id)
    return { success: false, error: `Could not save the employee record: ${employeeError.message}` }
  }

  revalidatePath('/admin/employees')
  return { success: true }
}
