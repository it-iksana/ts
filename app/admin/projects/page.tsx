import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import NewProjectForm from './new-project-form'
import TaskManager from './task-manager'

export default async function ProjectsPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, is_detailed, is_active, tasks(id, name)')
    .order('name')

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <a href="/" className="text-sm text-sky-700">← Back</a>
        <h1 className="text-lg font-bold text-slate-900 mt-1">
          Projects & Tasks
        </h1>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Add a project</h2>
          <NewProjectForm />
        </div>

        <div className="space-y-4">
          {(projects ?? []).map((project) => (
            <div key={project.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{project.name}</h3>
                <div className="flex items-center gap-2">
                  {project.is_detailed && (
                    <span className="text-xs bg-sky-50 text-sky-700 rounded-full px-2 py-1">
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
                  tasks={(project.tasks as { id: number; name: string }[]) ?? []}
                />
              )}
            </div>
          ))}

          {(!projects || projects.length === 0) && (
            <div className="bg-white rounded-xl shadow p-6 text-center text-slate-400">
              No projects yet — add the first one above.
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
