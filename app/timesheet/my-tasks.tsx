'use client'

import { useState } from 'react'
import { updateTaskStatus } from './actions'

type MyTask = {
  id: number
  name: string
  status: string
  due_date: string | null
  projects: { name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
}

function formatDueDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// Purely informational — never affects how much time can be logged
// against a task on any given day, just a heads-up on how urgent it is.
function dueDateColor(iso: string, status: string) {
  if (status === 'done') return 'text-slate-400'
  const today = new Date().toISOString().slice(0, 10)
  if (iso < today) return 'text-red-600'
  const twoDaysOut = new Date()
  twoDaysOut.setDate(twoDaysOut.getDate() + 2)
  if (iso <= twoDaysOut.toISOString().slice(0, 10)) return 'text-amber-600'
  return 'text-slate-500'
}

export default function MyTasks({ tasks }: { tasks: MyTask[] }) {
  const [errors, setErrors] = useState<Record<number, string>>({})

  async function handleChange(taskId: number, status: string) {
    setErrors((prev) => ({ ...prev, [taskId]: '' }))
    try {
      const result = await updateTaskStatus(taskId, status)
      if (!result.success) {
        setErrors((prev) => ({ ...prev, [taskId]: result.error }))
      }
    } catch {
      setErrors((prev) => ({ ...prev, [taskId]: 'Something went wrong.' }))
    }
  }

  if (tasks.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-slate-400 mb-2">Assigned to you</p>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {tasks.map((t) => (
          <div key={t.id} className="px-4 py-3 text-sm">
            <span className="text-ink font-medium">{t.name}</span>
            {t.projects && <p className="text-slate-500 text-xs mt-0.5">{t.projects.name}</p>}
            {t.due_date && (
              <p className={`text-xs mt-0.5 ${dueDateColor(t.due_date, t.status)}`}>
                Due {formatDueDate(t.due_date)}
              </p>
            )}
            <select
              defaultValue={t.status}
              onChange={(e) => handleChange(t.id, e.target.value)}
              className="w-full mt-2 text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors[t.id] && <p className="text-xs text-red-600 mt-1">{errors[t.id]}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
