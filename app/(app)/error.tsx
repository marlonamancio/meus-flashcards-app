'use client'

import { useEffect } from 'react'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: '100dvh', padding: '32px 24px', background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div className="text-lg font-bold">Não foi possível carregar esta página</div>
      <p className="text-sm mt-2" style={{ color: 'var(--muted)', maxWidth: 320 }}>
        Algo deu errado ao buscar seus dados. Tente novamente em instantes.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-2xl text-sm font-semibold"
        style={{ padding: '12px 20px', background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
