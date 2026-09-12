'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { success: true } | { success: false; error: string }

export async function updateMyProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in.' }

  const fullName = String(formData.get('full_name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const personalEmail = String(formData.get('personal_email') ?? '').trim()

  // Only these three columns are actually being changed here — the
  // database itself (migration 00016) is what genuinely enforces that a
  // plain employee can't touch anything else on their own row, even if
  // this action were ever called with different data some other way.
  const { error } = await supabase
    .from('employees')
    .update({
      full_name: fullName || null,
      address: address || null,
      personal_email: personalEmail || null,
    })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/profile')
  revalidatePath('/')
  return { success: true }
}
