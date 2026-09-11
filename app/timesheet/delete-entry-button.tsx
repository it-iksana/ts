'use client'

import { useState } from 'react'

type ActionResult = { success: true } | { success: false; error: string }

export default function DeleteEntryButton({
  id,
  action,
}: {
  id: number
  action: (id: number) => Promise<ActionResult>
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setDeleting(true)
    setError('')
    try {
      const result = await action(id)
      if (!result.success) {
        setError(result.error)
        setDeleting(false)
      }
      // On success the page revalidates and this row disappears on its
      // own — no local state to reset.
    } catch {
      setError('Something went wrong.')
      setDeleting(false)
    }
  }

  return (
    <span>
      <button
        onClick={handleClick}
        disabled={deleting}
        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
      >
        {deleting ? '…' : 'Delete'}
      </button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </span>
  )
}
