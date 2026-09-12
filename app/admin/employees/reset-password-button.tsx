'use client'

import { useState } from 'react'
import { resetEmployeePassword } from './actions'

export default function ResetPasswordButton({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleReset() {
    setError('')
    setSubmitting(true)
    try {
      const result = await resetEmployeePassword(employeeId, password)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        setPassword('')
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true)
          setSuccess(false)
        }}
        className="text-xs text-brand-blue hover:underline"
      >
        Reset Password
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          minLength={8}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-32 text-ink"
        />
        <button
          onClick={handleReset}
          disabled={submitting || password.length < 8}
          className="text-xs bg-brand-blue text-white rounded-lg px-2 py-1 disabled:opacity-50"
        >
          {submitting ? '…' : 'Set'}
        </button>
        <button
          onClick={() => {
            setOpen(false)
            setError('')
          }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-brand-teal">✓ Password reset — share it with them directly.</p>}
    </div>
  )
}
