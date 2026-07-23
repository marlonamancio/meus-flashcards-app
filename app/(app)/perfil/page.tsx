import { ChevronRight, Download, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getDisplayFirstName } from '@/lib/user-display'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { HeaderBrand } from '@/components/layout/HeaderBrand'
import { ThemeSwitchRow } from '@/components/perfil/ThemeSwitchRow'
import { LogoutButton } from '@/components/perfil/LogoutButton'

export default async function PerfilPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const displayName = getDisplayFirstName(user)
  const initial = (displayName ?? 'U').charAt(0).toUpperCase()

  return (
    <AppShell header={<Header displayName={displayName}><HeaderBrand /></Header>}>
      <div className="flex flex-col items-center text-center" style={{ padding: '18px 0 4px' }}>
        <div
          className="flex items-center justify-center rounded-full text-[28px] font-bold"
          style={{ width: 74, height: 74, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
        >
          {initial}
        </div>
        <div className="text-[19px] font-bold mt-3">{displayName ?? 'Usuária'}</div>
        <div className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>{user.email}</div>
      </div>

      <div className="flex gap-[9px] mt-5">
        {[
          { label: 'ofensiva', value: '0' },
          { label: 'revisões', value: '0' },
          { label: 'acerto', value: '—', color: 'var(--good)' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex-1 text-center rounded-2xl"
            style={{ padding: '13px 8px', background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="text-[19px] font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div
        className="text-[11.5px] font-bold uppercase"
        style={{ color: 'var(--muted)', letterSpacing: '0.06em', margin: '24px 0 10px' }}
      >
        Estudo
      </div>
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center justify-between rounded-2xl"
          style={{ padding: '14px 15px', background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <div className="text-sm font-semibold">Meta diária</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>cards por dia</div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center rounded-lg text-lg"
              style={{ width: 30, height: 30, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              −
            </span>
            <span className="text-[15px] font-bold" style={{ minWidth: 26, textAlign: 'center' }}>10</span>
            <span
              className="flex items-center justify-center rounded-lg text-lg"
              style={{ width: 30, height: 30, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              +
            </span>
          </div>
        </div>
        <ThemeSwitchRow />
      </div>

      <div
        className="text-[11.5px] font-bold uppercase"
        style={{ color: 'var(--muted)', letterSpacing: '0.06em', margin: '24px 0 10px' }}
      >
        App
      </div>
      <div className="flex flex-col gap-2">
        <div
          className="flex items-center gap-3 rounded-2xl"
          style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Download size={19} strokeWidth={1.9} style={{ color: 'var(--muted)' }} />
          <span className="flex-1 text-sm font-semibold">Instalar o app</span>
          <ChevronRight size={17} style={{ color: 'var(--muted)' }} />
        </div>
        <div
          className="flex items-center gap-3 rounded-2xl"
          style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Info size={19} strokeWidth={1.9} style={{ color: 'var(--muted)' }} />
          <span className="flex-1 text-sm font-semibold">Sobre o Meus Flashcards</span>
          <ChevronRight size={17} style={{ color: 'var(--muted)' }} />
        </div>
        <LogoutButton />
      </div>
    </AppShell>
  )
}
