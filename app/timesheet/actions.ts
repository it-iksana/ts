'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { success: true } | { success: false; error: string }

// A trigger in the database (not this code) is what actually enforces the
// one-day combined limit and blocks duplicates — this just needs to relay
// whatever it says back in a readable way, not re-implement the rule.
function readableError(message: string): string {
  if (message.includes('cannot exceed 1 combined day')) {
    return message.substring(message.indexOf('Total logged'))
  }
  if (message.includes('timesheet_entries_no_task_unique') || message.includes('timesheet_entries_employee_id_entry_date_project_id_task_id_key')) {
    return "You've already logged time against this exact project/task today — edit or delete the existing entry instead of adding a duplicate."
  }
  if (message.includes('leave_entries_employee_id_entry_date_key')) {
    return "You've already logged leave for this date — delete the existing entry first if you want to change it."
  }
  if (message.includes('timesheet_entries_task_project_fkey')) {
    return "That task doesn't belong to the selected project."
  }
  return message
}

export async function addTimesheetEntry(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in.' }

  const entryDate = String(formData.get('entry_date') ?? '')
  const projectId = Number(formData.get('project_id'))
  const taskIdRaw = formData.get('task_id')
  const taskId = taskIdRaw && taskIdRaw !== '' ? Number(taskIdRaw) : null
  const dayFraction = Number(formData.get('day_fraction'))

  if (!entryDate || !projectId || !dayFraction) {
    return { success: false, error: 'Date, project, and amount of time are all required.' }
  }

  const { error } = await supabase.from('timesheet_entries').insert({
    employee_id: user.id,
    entry_date: entryDate,
    project_id: projectId,
    task_id: taskId,
    day_fraction: dayFraction,
  })

  if (error) return { success: false, error: readableError(error.message) }

  revalidatePath('/timesheet')
  return { success: true }
}

export async function deleteTimesheetEntry(id: number): Promise<ActionResult> {
  const supabase = await createClient()
  // No need to also filter by employee_id here — the RLS policy already
  // restricts deletion to the caller's own rows regardless of what this
  // query asks for; this is just fetching by primary key.
  const { error } = await supabase.from('timesheet_entries').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/timesheet')
  return { success: true }
}

export async function addLeaveEntry(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not signed in.' }

  const entryDate = String(formData.get('entry_date') ?? '')
  const leaveType = String(formData.get('leave_type') ?? '')
  const duration = Number(formData.get('duration'))

  if (!entryDate || !leaveType || !duration) {
    return { success: false, error: 'Date, leave type, and duration are all required.' }
  }

  const { error } = await supabase.from('leave_entries').insert({
    employee_id: user.id,
    entry_date: entryDate,
    leave_type: leaveType,
    duration,
  })

  if (error) return { success: false, error: readableError(error.message) }

  revalidatePath('/timesheet')
  return { success: true }
}

export async function deleteLeaveEntry(id: number): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('leave_entries').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/timesheet')
  return { success: true }
}

export async function updateTaskStatus(taskId: number, status: string): Promise<ActionResult> {
  const supabase = await createClient()
  // The database itself enforces that this can only change status and
  // nothing else about the task (see migration 00014) — this action
  // doesn't need to re-check that, only relay whatever the database
  // says if something's wrong.
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/timesheet')
  return { success: true }
}
