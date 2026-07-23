import { Inbox, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getDisplayFirstName } from '@/lib/user-display'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { HeaderBrand } from '@/components/layout/HeaderBrand'
import { HeaderTitle } from '@/components/layout/HeaderTitle'

export default async function ColecoesPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const displayName = getDisplayFirstName(user)

  return (
    <AppShell header={<Header displayName={displayName}><HeaderBrand /></Header>}>
      <div className="flex justify-between items-center" style={{ padding: '18px 0 2px' }}>
        <HeaderTitle title="Coleções" />
        <button
          aria-label="Nova coleção"
          className="flex items-center justify-center rounded-xl flex-none"
          style={{ width: 40, height: 40, background: 'var(--accent)', color: 'var(--on-accent)', boxShadow: '0 6px 16px var(--accent-soft)' }}
        >
          <Plus size={22} strokeWidth={2.6} />
        </button>
      </div>

      <div className="relative mt-3.5">
        <Search size={18} className="absolute" style={{ left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          placeholder="Buscar coleção"
          className="w-full text-sm rounded-[13px]"
          style={{ padding: '12px 14px 12px 40px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>

      <div
        className="flex items-center gap-[14px] rounded-2xl"
        style={{ padding: '14px 13px', marginTop: 14, background: 'var(--surface-2)', border: '1px dashed var(--border)' }}
      >
        <div
          className="flex items-center justify-center rounded-xl flex-none"
          style={{ width: 44, height: 44, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <Inbox size={20} strokeWidth={1.8} />
        </div>
        <div className="flex-1">
          <div className="text-[14.5px] font-semibold">Não organizados</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>0 cards sem coleção</div>
        </div>
      </div>

      <div
        className="text-[11.5px] font-bold uppercase"
        style={{ color: 'var(--muted)', letterSpacing: '0.06em', margin: '22px 0 11px' }}
      >
        Todas · 0
      </div>
      <div
        className="rounded-2xl text-center"
        style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
      >
        Nenhuma coleção ainda. Toque em + para criar a primeira.
      </div>
    </AppShell>
  )
}
