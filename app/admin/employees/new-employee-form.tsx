'use client'

import { useState } from 'react'
import { createEmployee } from './actions'

type Department = { id: number; name: string }

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'tl_dc', label: 'TL / DC' },
  { value: 'cost_admin', label: 'Cost Admin' },
]

export default function NewEmployeeForm({
  departments,
  callerRole,
}: {
  departments: Department[]
  callerRole: string
}) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState('employee')

  const visibleRoles = ROLE_OPTIONS.filter(
    (r) => r.value !== 'cost_admin' || callerRole === 'cost_admin'
  )

  async function handleSubmit(formData: FormData) {
    setError('')
    setSuccess(false)
    setSubmitting(true)

    try {
      const result = await createEmployee(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        const form = document.getElementById('new-employee-form') as HTMLFormElement | null
        form?.reset()
        setRole('employee')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form id="new-employee-form" action={handleSubmit} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="text-sm bg-emerald-50 text-emerald-700 rounded-lg px-4 py-3">
          ✓ Employee added.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Employee Code</label>
          <input
            name="employee_code"
            type="text"
            required
            placeholder="e.g. EMP004"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input
            name="full_name"
            type="text"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Temporary Password
        </label>
        <input
          name="password"
          type="text"
          required
          minLength={8}
          placeholder="At least 8 characters — share this with them directly"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
        <div className="flex gap-2">
          {visibleRoles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium border transition-colors ${
                role === r.value
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
          <select
            name="department_id"
            defaultValue=""
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink bg-white"
          >
            <option value="">— None yet —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date of Joining
          </label>
          <input
            name="date_of_joining"
            type="date"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-brand-blue text-white rounded-lg px-5 py-2.5 font-medium disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add Employee'}
      </button>
    </form>
  )
}
