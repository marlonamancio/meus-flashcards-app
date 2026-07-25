'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getPasswordHints, isPasswordValid } from '@/lib/password-policy'
import { Alert } from '@/components/ui/Alert'
import { PasswordHintsList } from '@/components/ui/PasswordHintsList'
import { ArrowRight, Eye, EyeOff, Loader2, MailCheck } from 'lucide-react'

export function SignupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const passwordHints = getPasswordHints(password)
  const showHints = password.length > 0 && !isPasswordValid(passwordHints)
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Informe seu nome.')
      return
    }
    if (!isPasswordValid(passwordHints)) {
      setError('A senha não atende aos requisitos mínimos.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: trimmedName } },
      })

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          setError('Este e-mail já está cadastrado. Faça login.')
        } else {
          setError(error.message)
        }
        return
      }

      // Se o projeto exige confirmação de e-mail, signUp() não retorna sessão — mostramos o
      // aviso de verificação. Se a confirmação estiver desabilitada, já vem sessão ativa.
      if (data.session) {
        router.push('/home')
        router.refresh()
        return
      }

      setSentTo(email)
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

  if (sentTo) {
    return (
      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 56, height: 56, background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          <MailCheck size={26} strokeWidth={1.8} />
        </div>
        <div className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>
          Verifique seu e-mail
        </div>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          Enviamos um link de confirmação para <strong style={{ color: 'var(--text)' }}>{sentTo}</strong>. Abra o
          e-mail e confirme para poder entrar.
        </p>
        <Link href="/login" className="mt-2 text-[14px] font-semibold" style={{ color: 'var(--accent)' }}>
          Ir para o login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <label className="flex flex-col gap-[7px]">
        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--muted)' }}>
          Nome
        </span>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          className="w-full text-[15px] outline-none transition-all border-[1.5px] rounded-[13px]"
          style={{ ...inputStyle, padding: '14px 15px' }}
          onFocus={focusInput}
          onBlur={blurInput}
        />
      </label>

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
            autoComplete="new-password"
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
        {showHints && <PasswordHintsList hints={passwordHints} />}
      </label>

      {/* Confirm password */}
      <label className="flex flex-col gap-[7px]">
        <span className="text-[12.5px] font-semibold" style={{ color: 'var(--muted)' }}>
          Confirmar senha
        </span>
        <input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••••"
          className="w-full text-[15px] outline-none transition-all border-[1.5px] rounded-[13px]"
          style={{ ...inputStyle, padding: '14px 15px' }}
          onFocus={focusInput}
          onBlur={blurInput}
        />
        {passwordsMismatch && (
          <span className="text-xs" style={{ color: 'var(--bad)' }}>
            As senhas não coincidem
          </span>
        )}
      </label>

      {/* Error message */}
      {error && <Alert>{error}</Alert>}

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
            Criando conta...
          </>
        ) : (
          <>
            Criar conta
            <ArrowRight size={17} strokeWidth={2.4} />
          </>
        )}
      </button>

      {/* Footer note */}
      <p className="text-center text-[13.5px] mt-2" style={{ color: 'var(--muted)' }}>
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>
          Entrar
        </Link>
      </p>
    </form>
  )
}
