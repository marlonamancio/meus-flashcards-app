'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-left rounded-2xl text-sm font-semibold disabled:opacity-60"
      style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--bad)' }}
    >
      {loading ? 'Saindo...' : 'Sair da conta'}
    </button>
  )
}
