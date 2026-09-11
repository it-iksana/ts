'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { success: true } | { success: false; error: string }

export async function createDepartment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const name = String(formData.get('name') ?? '').trim()

  if (!name) {
    return { success: false, error: 'Department name is required.' }
  }

  const { error } = await supabase.from('departments').insert({ name })

  if (error) {
    const message = error.message.includes('duplicate')
      ? `A department named "${name}" already exists.`
      : error.message
    return { success: false, error: message }
  }

  revalidatePath('/admin/departments')
  revalidatePath('/admin/employees')
  return { success: true }
}
