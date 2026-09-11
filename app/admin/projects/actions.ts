'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { success: true } | { success: false; error: string }

export async function createProject(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const name = String(formData.get('name') ?? '').trim()
  const isDetailed = formData.get('is_detailed') === 'on'

  if (!name) {
    return { success: false, error: 'Project name is required.' }
  }

  // No need to manually re-check the caller's role here the way the
  // employee Server Action does — this write goes through the normal
  // Supabase client, so the "projects_write_admin_only" RLS policy on the
  // real database enforces it either way, not just this form's UI.
  const { error } = await supabase.from('projects').insert({
    name,
    is_detailed: isDetailed,
  })

  if (error) {
    const message = error.message.includes('duplicate')
      ? `A project named "${name}" already exists.`
      : error.message
    return { success: false, error: message }
  }

  revalidatePath('/admin/projects')
  return { success: true }
}

export async function createTask(projectId: number, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const name = String(formData.get('name') ?? '').trim()

  if (!name) {
    return { success: false, error: 'Task name is required.' }
  }

  const { error } = await supabase.from('tasks').insert({
    project_id: projectId,
    name,
  })

  if (error) {
    const message = error.message.includes('duplicate')
      ? `A task named "${name}" already exists on this project.`
      : error.message
    return { success: false, error: message }
  }

  revalidatePath('/admin/projects')
  return { success: true }
}
