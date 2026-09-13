'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { success: true } | { success: false; error: string }

export async function createHoliday(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const holidayDate = String(formData.get('holiday_date') ?? '')
  const name = String(formData.get('name') ?? '').trim()

  if (!holidayDate || !name) {
    return { success: false, error: 'Date and name are both required.' }
  }

  const { error } = await supabase.from('holidays').insert({ holiday_date: holidayDate, name })

  if (error) {
    const message = error.message.includes('duplicate')
      ? `A holiday is already recorded on ${holidayDate}.`
      : error.message
    return { success: false, error: message }
  }

  revalidatePath('/admin/holidays')
  revalidatePath('/admin/reports')
  return { success: true }
}

export async function deleteHoliday(id: number): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('holidays').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/holidays')
  revalidatePath('/admin/reports')
  return { success: true }
}
