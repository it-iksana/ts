'use client'

import { useState } from 'react'
import { addTimesheetEntry } from './actions'

type Task = { id: number; name: string }
type Project = { id: number; name: string; is_detailed: boolean; tasks: Task[] }

const FRACTION_OPTIONS = [
  { value: 0.25, label: '¼ day' },
  { value: 0.5, label: '½ day' },
  { value: 0.75, label: '¾ day' },
  { value: 1, label: 'Full day' },
]

export default function AddEntryForm({
  entryDate,
  projects,
}: {
  entryDate: string
  projects: Project[]
}) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const selectedProject = projects.find((p) => p.id === Number(selectedProjectId))

  async function handleSubmit(formData: FormData) {
    setError('')
    setSubmitting(true)
    try {
      const result = await addTimesheetEntry(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        const form = document.getElementById('add-entry-form') as HTMLFormElement | null
        form?.reset()
        setSelectedProjectId('')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (projects.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No active projects available — ask an admin to add one.
      </p>
    )
  }

  return (
    <form id="add-entry-form" action={handleSubmit} className="space-y-3">
      <input type="hidden" name="entry_date" value={entryDate} />
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-md px-4 py-3">{error}</div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
          <select
            name="project_id"
            required
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
          >
            <option value="">Select…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProject?.is_detailed && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Task</label>
            <select
              name="task_id"
              required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
            >
              <option value="">Select…</option>
              {selectedProject.tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
          <select
            name="day_fraction"
            required
            defaultValue="1"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
          >
            {FRACTION_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-sky-700 text-white rounded-md px-4 py-2 font-medium disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add entry'}
      </button>
    </form>
  )
}
