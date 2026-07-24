'use client'

import { useState, type ChangeEvent } from 'react'
import { AlertTriangle } from 'lucide-react'
import { deleteAccountAction } from '@/app/(app)/perfil/delete-account-action'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'

export function DeleteAccountSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canConfirm = confirmText.trim().toLowerCase() === email.toLowerCase()

  function handleClose() {
    if (loading) return
    setOpen(false)
    setConfirmText('')
    setError(null)
  }

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    setConfirmText(e.target.value)
  }

  async function handleDelete() {
    if (!canConfirm || loading) return

    setLoading(true)
    setError(null)

    const result = await deleteAccountAction()

    // On success the action redirects server-side and never returns here — this only runs
    // when it comes back with an error.
    if (result && !result.ok) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-left rounded-2xl text-sm font-semibold"
        style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--bad)' }}
      >
        <AlertTriangle size={17} strokeWidth={2} />
        Excluir conta
      </button>

      <Modal open={open} onClose={handleClose}>
        <div className="text-[15px] font-bold mb-2">Excluir conta permanentemente?</div>
        <p className="text-[13px]" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          Essa ação é irreversível. Todos os seus flashcards, coleções, materiais e histórico de estudo serão apagados. Para
          confirmar, digite seu e-mail (<b style={{ color: 'var(--text)' }}>{email}</b>) abaixo.
        </p>
        <input
          autoFocus
          value={confirmText}
          onChange={handleInput}
          placeholder={email}
          disabled={loading}
          className="w-full text-sm rounded-xl"
          style={{ marginTop: 12, padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        {error && <Alert style={{ marginTop: 10 }}>{error}</Alert>}
        <div className="flex gap-[9px] mt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ padding: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={!canConfirm || loading}
            className="flex-1 rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ padding: 11, background: 'var(--bad)', color: '#fff' }}
          >
            {loading ? 'Excluindo...' : 'Excluir definitivamente'}
          </button>
        </div>
      </Modal>
    </>
  )
}
