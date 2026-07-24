import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

// Deliberately outside the (app) route group: its layout calls requireUser() and would bounce
// straight to /login before this page could render, since the account (and its session) no
// longer exist by the time deleteAccountAction redirects here.
export default function ContaExcluidaPage() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: '100dvh', padding: '32px 24px', background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 64, height: 64, marginBottom: 20, background: 'var(--surface-2)', color: 'var(--muted)' }}
      >
        <CheckCircle2 size={30} strokeWidth={1.8} />
      </div>
      <div className="text-lg font-bold">Conta excluída</div>
      <p className="text-sm mt-2" style={{ color: 'var(--muted)', maxWidth: 320 }}>
        Sua conta e todos os dados associados — flashcards, coleções, materiais e histórico de estudo — foram removidos
        permanentemente.
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-2xl text-sm font-semibold"
        style={{ padding: '12px 20px', background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        Ir para o login
      </Link>
    </div>
  )
}
