'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className={cn(
            'w-full px-4 py-3 rounded-xl text-sm outline-none transition-all',
            'border focus:ring-2 focus:ring-orange-500/20'
          )}
          style={{
            background: 'var(--input-bg)',
            color: 'var(--foreground)',
            borderColor: 'var(--input-border)',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--input-border-focus)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            className={cn(
              'w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all',
              'border focus:ring-2 focus:ring-orange-500/20'
            )}
            style={{
              background: 'var(--input-bg)',
              color: 'var(--foreground)',
              borderColor: 'var(--input-border)',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--input-border-focus)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
            style={{ color: 'var(--foreground-muted)' }}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Password hints */}
        {showHints && (
          <ul className="space-y-1 mt-2">
            {!passwordHints.length && (
              <li className="text-xs" style={{ color: 'var(--error)' }}>
                Mínimo de 10 caracteres
              </li>
            )}
            {!passwordHints.uppercase && (
              <li className="text-xs" style={{ color: 'var(--error)' }}>
                Adicione uma letra maiúscula
              </li>
            )}
            {!passwordHints.lowercase && (
              <li className="text-xs" style={{ color: 'var(--error)' }}>
                Adicione uma letra minúscula
              </li>
            )}
            {!passwordHints.number && (
              <li className="text-xs" style={{ color: 'var(--error)' }}>
                Adicione um número
              </li>
            )}
            {!passwordHints.symbol && (
              <li className="text-xs" style={{ color: 'var(--error)' }}>
                Adicione um símbolo (ex: !@#$)
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm px-4 py-3 rounded-xl" style={{
          color: 'var(--error)',
          background: 'color-mix(in srgb, var(--error) 10%, transparent)',
        }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'w-full py-3 rounded-xl text-sm font-semibold transition-all',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          'active:scale-[0.98]'
        )}
        style={{
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
        }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Entrando...
          </span>
        ) : (
          'Entrar'
        )}
      </button>

      {/* Footer note */}
      <p className="text-center text-xs" style={{ color: 'var(--foreground-muted)' }}>
        Acesso restrito. Fale com o administrador para recuperar a senha.
      </p>
    </form>
  )
}
