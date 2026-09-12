'use client'

import { useState } from 'react'
import { addTimesheetEntry } from './actions'

type Task = { id: number; name: string; due_date: string | null }
type Project = { id: number; name: string; is_detailed: boolean; tasks: Task[] }

const FRACTION_OPTIONS = [
  { value: 0.25, label: '¼' },
  { value: 0.5, label: '½' },
  { value: 0.75, label: '¾' },
  { value: 1, label: 'Full' },
]

function formatShortDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

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
  const [fraction, setFraction] = useState(1)

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
        setFraction(1)
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
    <form id="add-entry-form" action={handleSubmit} className="space-y-4">
      <input type="hidden" name="entry_date" value={entryDate} />
      <input type="hidden" name="day_fraction" value={fraction} />
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
          <select
            name="project_id"
            required
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink bg-white"
          >
            <option value="">Select…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Task</label>
          {selectedProject?.is_detailed && selectedProject.tasks.length > 0 ? (
            <select
              name="task_id"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink bg-white"
            >
              <option value="">Select…</option>
              {selectedProject.tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.due_date ? ` (Due ${formatShortDate(t.due_date)})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <select
              disabled
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-400 bg-slate-50"
            >
              <option>
                {!selectedProject
                  ? 'Select a project first'
                  : selectedProject.is_detailed
                    ? 'No tasks assigned to you on this project'
                    : 'Not needed for this project'}
              </option>
            </select>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">How much time</label>
        <div className="flex gap-2">
          {FRACTION_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFraction(f.value)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium border transition-colors ${
                fraction === f.value
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-brand-blue text-white rounded-lg px-5 py-2.5 font-medium disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add entry'}
      </button>
    </form>
  )
}
