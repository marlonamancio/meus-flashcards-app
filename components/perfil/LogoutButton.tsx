'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/components/ui/Alert'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogout() {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      setError('Não foi possível sair da conta. Tente novamente.')
      setLoading(false)
      return
    }

    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleLogout}
        disabled={loading}
        className="text-left rounded-2xl text-sm font-semibold disabled:opacity-60"
        style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--bad)' }}
      >
        {loading ? 'Saindo...' : 'Sair da conta'}
      </button>
      {error && <Alert>{error}</Alert>}
    </div>
  )
}
