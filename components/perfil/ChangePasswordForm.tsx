'use client'

import { useState, type FormEvent } from 'react'
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { getPasswordHints, isPasswordValid } from '@/lib/password-policy'
import { updatePasswordAction } from '@/app/(app)/perfil/actions'
import { Alert } from '@/components/ui/Alert'
import { PasswordHintsList } from '@/components/ui/PasswordHintsList'

const fieldStyle = {
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const newPasswordHints = getPasswordHints(newPassword)
  const showHints = newPassword.length > 0 && !isPasswordValid(newPasswordHints)
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return

    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('A confirmação não é igual à nova senha.')
      return
    }
    if (!isPasswordValid(newPasswordHints)) {
      setError('A nova senha não atende aos requisitos de segurança.')
      return
    }

    setLoading(true)
    const result = await updatePasswordAction(currentPassword, newPassword)
    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSuccess(true)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2.5 rounded-2xl"
      style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <label className="flex flex-col gap-[6px]">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Senha atual
        </span>
        <div className="relative flex items-center">
          <input
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
            className="w-full text-sm rounded-xl"
            style={{ ...fieldStyle, padding: '11px 40px 11px 12px' }}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-3"
            style={{ color: 'var(--muted)' }}
            aria-label={showCurrent ? 'Ocultar senha atual' : 'Mostrar senha atual'}
          >
            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-[6px]">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Nova senha
        </span>
        <div className="relative flex items-center">
          <input
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            className="w-full text-sm rounded-xl"
            style={{ ...fieldStyle, padding: '11px 40px 11px 12px' }}
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-3"
            style={{ color: 'var(--muted)' }}
            aria-label={showNew ? 'Ocultar nova senha' : 'Mostrar nova senha'}
          >
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {showHints && <PasswordHintsList hints={newPasswordHints} />}
      </label>

      <label className="flex flex-col gap-[6px]">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Confirmar nova senha
        </span>
        <input
          type={showNew ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          className="w-full text-sm rounded-xl"
          style={{ ...fieldStyle, padding: '11px 12px' }}
        />
        {mismatch && (
          <span className="text-xs" style={{ color: 'var(--bad)' }}>
            As senhas não coincidem.
          </span>
        )}
      </label>

      {error && <Alert>{error}</Alert>}
      {success && (
        <div
          className="flex items-center gap-2 text-xs font-semibold rounded-xl"
          style={{ padding: '10px 12px', background: 'var(--good-soft)', color: 'var(--good)' }}
        >
          <Check size={14} />
          Senha alterada com sucesso.
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !currentPassword || !newPassword || !confirmPassword}
        className="flex items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-60"
        style={{ padding: 12, marginTop: 4, background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : null}
        {loading ? 'Salvando...' : 'Alterar senha'}
      </button>
    </form>
  )
}
