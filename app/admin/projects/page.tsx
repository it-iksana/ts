import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import AppHeader from '../../_components/app-header'
import NewProjectForm from './new-project-form'
import TaskManager from './task-manager'

export default async function ProjectsPage() {
  await requireAdmin()
  const supabase = await createClient()

  const [projectsRes, employeesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, is_detailed, is_active, tasks(id, name, assigned_to, due_date)')
      .order('name'),
    supabase
      .from('employees')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name'),
  ])
  const projects = projectsRes.data
  const employees = employeesRes.data ?? []

  return (
    <main className="min-h-screen bg-paper">
      <AppHeader title="Projects & Tasks" />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-ink mb-4">Add a project</h2>
          <NewProjectForm />
        </div>

        <div className="space-y-3">
          {(projects ?? []).map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink">{project.name}</h3>
                <div className="flex items-center gap-2">
                  {project.is_detailed && (
                    <span className="text-xs bg-brand-blue/10 text-brand-blue rounded-full px-2 py-1">
                      Detailed
                    </span>
                  )}
                  {!project.is_active && (
                    <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-1">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {project.is_detailed && (
                <TaskManager
                  projectId={project.id}
                  tasks={
                    (project.tasks as { id: number; name: string; assigned_to: string | null; due_date: string | null }[]) ??
                    []
                  }
                  employees={employees}
                />
              )}
            </div>
          ))}

          {(!projects || projects.length === 0) && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-400">
              No projects yet — add the first one above.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
