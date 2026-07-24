'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { COLLECTION_PALETTE, getAvatarPalette, type AvatarColorKey } from '@/lib/palette'
import { updateAvatarColorAction, updateDisplayNameAction } from '@/app/(app)/perfil/actions'
import { Alert } from '@/components/ui/Alert'

export function ProfileIdentity({
  initialName,
  email,
  initialAvatarColor,
}: {
  initialName: string | null
  email: string
  initialAvatarColor: string | null
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName ?? '')
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(initialName ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [avatarColor, setAvatarColor] = useState(initialAvatarColor)
  const [pickingColor, setPickingColor] = useState(false)
  const [savingColor, setSavingColor] = useState(false)
  const [colorError, setColorError] = useState<string | null>(null)

  const palette = getAvatarPalette(avatarColor)
  const initial = (name || 'U').charAt(0).toUpperCase()

  function openNameEdit() {
    setNameDraft(name)
    setNameError(null)
    setEditingName(true)
  }

  function cancelNameEdit() {
    if (savingName) return
    setEditingName(false)
    setNameError(null)
  }

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault()
    if (savingName) return

    setSavingName(true)
    setNameError(null)

    const result = await updateDisplayNameAction(nameDraft)

    setSavingName(false)

    if (!result.ok) {
      setNameError(result.error)
      return
    }

    setName(result.name)
    setEditingName(false)
    router.refresh()
  }

  async function handlePickColor(key: AvatarColorKey) {
    if (savingColor || key === avatarColor) {
      setPickingColor(false)
      return
    }

    setSavingColor(true)
    setColorError(null)

    const result = await updateAvatarColorAction(key)

    setSavingColor(false)

    if (!result.ok) {
      setColorError(result.error)
      return
    }

    setAvatarColor(result.key)
    setPickingColor(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center text-center" style={{ padding: '18px 0 4px' }}>
      <div className="relative">
        <button
          onClick={() => setPickingColor((v) => !v)}
          aria-label="Escolher cor do avatar"
          className="flex items-center justify-center rounded-full text-[28px] font-bold"
          style={{ width: 74, height: 74, background: palette.soft, color: palette.color }}
        >
          {initial}
        </button>
        <span
          className="absolute flex items-center justify-center rounded-full"
          style={{ width: 24, height: 24, right: -2, bottom: -2, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          {savingColor ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
        </span>
      </div>

      {pickingColor && (
        <div className="flex items-center gap-3 justify-center" style={{ marginTop: 12 }}>
          {COLLECTION_PALETTE.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePickColor(p.key)}
              aria-label={`Cor ${p.key}`}
              disabled={savingColor}
              className="rounded-full disabled:opacity-60"
              style={{
                width: 30,
                height: 30,
                background: p.color,
                border: p.key === avatarColor ? '2.5px solid var(--text)' : '2.5px solid transparent',
                boxShadow: '0 0 0 1px var(--border)',
              }}
            />
          ))}
        </div>
      )}
      {colorError && <Alert style={{ marginTop: 10 }}>{colorError}</Alert>}

      {editingName ? (
        <form onSubmit={handleNameSubmit} className="w-full" style={{ marginTop: 12, maxWidth: 260 }}>
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            disabled={savingName}
            className="w-full text-center text-[16px] font-bold rounded-xl"
            style={{ padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <div className="flex gap-2 justify-center" style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={cancelNameEdit}
              disabled={savingName}
              aria-label="Cancelar"
              className="flex items-center justify-center rounded-lg disabled:opacity-60"
              style={{ width: 30, height: 30, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <X size={15} />
            </button>
            <button
              type="submit"
              disabled={savingName || !nameDraft.trim()}
              aria-label="Salvar nome"
              className="flex items-center justify-center rounded-lg disabled:opacity-60"
              style={{ width: 30, height: 30, background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {savingName ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            </button>
          </div>
          {nameError && <Alert style={{ marginTop: 8 }}>{nameError}</Alert>}
        </form>
      ) : (
        <button onClick={openNameEdit} className="flex items-center gap-1.5" style={{ marginTop: 12 }}>
          <span className="text-[19px] font-bold">{name || 'Usuária'}</span>
          <Pencil size={13} style={{ color: 'var(--muted)' }} />
        </button>
      )}

      <div className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>
        {email}
      </div>
    </div>
  )
}
