'use client'

import { useState } from 'react'
import { updateDailyGoalAction } from '@/app/(app)/perfil/actions'
import { Alert } from '@/components/ui/Alert'

const MIN_GOAL = 1
const MAX_GOAL = 200

export function DailyGoalStepper({ initialValue }: { initialValue: number }) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(delta: number) {
    if (saving) return

    const next = Math.min(MAX_GOAL, Math.max(MIN_GOAL, value + delta))
    if (next === value) return

    const previous = value
    setValue(next)
    setSaving(true)
    setError(null)

    const result = await updateDailyGoalAction(next)

    setSaving(false)

    if (!result.ok) {
      setValue(previous)
      setError(result.error)
      return
    }

    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 600)
  }

  return (
    <div
      className="flex items-center justify-between rounded-2xl"
      style={{ padding: '14px 15px', background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div>
        <div className="text-sm font-semibold">Meta diária</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          cards por dia
        </div>
        {error && <Alert style={{ marginTop: 8 }}>{error}</Alert>}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleChange(-1)}
          disabled={saving || value <= MIN_GOAL}
          aria-label="Diminuir meta diária"
          className="flex items-center justify-center rounded-lg text-lg disabled:opacity-40"
          style={{ width: 30, height: 30, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          −
        </button>
        <span
          className="text-[15px] font-bold transition-colors"
          style={{ minWidth: 26, textAlign: 'center', color: justSaved ? 'var(--accent-strong)' : 'var(--text)' }}
        >
          {value}
        </span>
        <button
          onClick={() => handleChange(1)}
          disabled={saving || value >= MAX_GOAL}
          aria-label="Aumentar meta diária"
          className="flex items-center justify-center rounded-lg text-lg disabled:opacity-40"
          style={{ width: 30, height: 30, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          +
        </button>
      </div>
    </div>
  )
}
