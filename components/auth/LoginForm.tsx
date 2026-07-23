'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Client-side password validation (mirrors Supabase policy for UX feedback only)
  const passwordHints = {
    length: password.length >= 10,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }
  const isPasswordValid = Object.values(passwordHints).every(Boolean)
  const showHints = password.length > 0 && !isPasswordValid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('E-mail ou senha incorretos.')
        } else {
          setError(error.message)
        }
        return
      }

      router.push('/home')
      router.refresh()
    } catch {
      setError('Erro ao conectar. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--surface)',
    color: 'var(--text)',
    borderColor: 'var(--border)',
  }

  function focusInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = 'var(--accent)'
    e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'
  }

  function blurInput(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = 'var(--border)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Email */}
      <label className="flex flex-col gap-[7px]">
        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--muted)' }}>
          E-mail
        </span>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full text-[15px] outline-none transition-all border-[1.5px] rounded-[13px]"
          style={{ ...inputStyle, padding: '14px 15px' }}
          onFocus={focusInput}
          onBlur={blurInput}
        />
      </label>

      {/* Password */}
      <label className="flex flex-col gap-[7px]">
        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--muted)' }}>
          Senha
        </span>
        <div className="relative flex items-center">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            className="w-full text-[15px] outline-none transition-all border-[1.5px] rounded-[13px]"
            style={{ ...inputStyle, padding: '14px 44px 14px 15px' }}
            onFocus={focusInput}
            onBlur={blurInput}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-[14px] transition-opacity hover:opacity-70"
            style={{ color: 'var(--muted)' }}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Password hints */}
        {showHints && (
          <ul className="space-y-1 mt-1">
            {!passwordHints.length && (
              <li className="text-xs" style={{ color: 'var(--bad)' }}>
                Mínimo de 10 caracteres
              </li>
            )}
            {!passwordHints.uppercase && (
              <li className="text-xs" style={{ color: 'var(--bad)' }}>
                Adicione uma letra maiúscula
              </li>
            )}
            {!passwordHints.lowercase && (
              <li className="text-xs" style={{ color: 'var(--bad)' }}>
                Adicione uma letra minúscula
              </li>
            )}
            {!passwordHints.number && (
              <li className="text-xs" style={{ color: 'var(--bad)' }}>
                Adicione um número
              </li>
            )}
            {!passwordHints.symbol && (
              <li className="text-xs" style={{ color: 'var(--bad)' }}>
                Adicione um símbolo (ex: !@#$)
              </li>
            )}
          </ul>
        )}
      </label>

      {/* Error message */}
      {error && (
        <p
          className="text-sm rounded-[13px]"
          style={{
            color: 'var(--bad)',
            background: 'var(--bad-soft)',
            padding: '12px 15px',
          }}
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'mt-1 flex items-center justify-center gap-2 rounded-[13px] text-[15.5px] font-semibold transition-all',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'active:scale-[0.98]'
        )}
        style={{
          padding: '15px',
          background: 'var(--accent)',
          color: 'var(--on-accent)',
          boxShadow: '0 8px 20px var(--accent-soft)',
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Entrando...
          </>
        ) : (
          <>
            Entrar
            <ArrowRight size={17} strokeWidth={2.4} />
          </>
        )}
      </button>

      {/* Footer note */}
      <p className="text-center text-[13.5px] mt-2" style={{ color: 'var(--muted)' }}>
        Acesso restrito. Fale com o administrador para recuperar a senha.
      </p>
    </form>
  )
}
