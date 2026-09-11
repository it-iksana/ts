'use client'

import { useState } from 'react'
import { createTask, assignTask } from './actions'

type Task = { id: number; name: string; assigned_to: string | null }
type Employee = { id: string; full_name: string }

export default function TaskManager({
  projectId,
  tasks,
  employees,
}: {
  projectId: number
  tasks: Task[]
  employees: Employee[]
}) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [assignError, setAssignError] = useState<Record<number, string>>({})

  async function handleSubmit(formData: FormData) {
    setError('')
    setSubmitting(true)
    try {
      const result = await createTask(projectId, formData)
      if (!result.success) {
        setError(result.error)
      } else {
        const form = document.getElementById(
          `new-task-form-${projectId}`
        ) as HTMLFormElement | null
        form?.reset()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssign(taskId: number, employeeId: string) {
    setAssignError((prev) => ({ ...prev, [taskId]: '' }))
    try {
      const result = await assignTask(taskId, employeeId === '' ? null : employeeId)
      if (!result.success) {
        setAssignError((prev) => ({ ...prev, [taskId]: result.error }))
      }
    } catch {
      setAssignError((prev) => ({ ...prev, [taskId]: 'Something went wrong.' }))
    }
  }

  return (
    <div className="mt-3 pl-4 border-l-2 border-slate-100">
      <p className="text-sm font-medium text-slate-500 mb-2">Tasks</p>
      {tasks.length === 0 && (
        <p className="text-sm text-slate-400 mb-2">No tasks yet.</p>
      )}
      <div className="space-y-2 mb-3">
        {tasks.map((t) => (
          <div key={t.id}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink">{t.name}</span>
              <select
                defaultValue={t.assigned_to ?? ''}
                onChange={(e) => handleAssign(t.id, e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white"
              >
                <option value="">Unassigned</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>
            {assignError[t.id] && (
              <p className="text-xs text-red-600 mt-1">{assignError[t.id]}</p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="text-xs bg-red-50 text-red-700 rounded-lg px-3 py-2 mb-2">
          {error}
        </div>
      )}

      <form
        id={`new-task-form-${projectId}`}
        action={handleSubmit}
        className="flex gap-2"
      >
        <input
          name="name"
          type="text"
          required
          placeholder="New task name"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-ink"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand-teal text-white rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </form>
    </div>
  )
}
