import { ChevronRight, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getDisplayFirstName, getDisplayName, getUserAvatarPalette } from '@/lib/user-display'
import { getOverallStats, getUserStats } from '@/lib/home-data'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { HeaderBrand } from '@/components/layout/HeaderBrand'
import { ThemeSwitchRow } from '@/components/perfil/ThemeSwitchRow'
import { LogoutButton } from '@/components/perfil/LogoutButton'
import { DailyGoalStepper } from '@/components/perfil/DailyGoalStepper'
import { InstallAppRow } from '@/components/perfil/InstallAppRow'
import { DeleteAccountSection } from '@/components/perfil/DeleteAccountSection'
import { ProfileIdentity } from '@/components/perfil/ProfileIdentity'
import { ChangePasswordForm } from '@/components/perfil/ChangePasswordForm'

export default async function PerfilPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const displayName = getDisplayFirstName(user)
  const fullName = getDisplayName(user)
  const avatarPalette = getUserAvatarPalette(user)

  const [overall, userStats] = await Promise.all([getOverallStats(supabase, user.id), getUserStats(supabase, user.id)])

  const stats = [
    { label: 'ofensiva', value: String(overall.streakAtual) },
    { label: 'revisões', value: String(overall.totalReviews) },
    { label: 'acerto', value: overall.avgAccuracyPct !== null ? `${overall.avgAccuracyPct}%` : '—', color: 'var(--good)' },
  ]

  return (
    <AppShell header={<Header displayName={displayName} avatarPalette={avatarPalette}><HeaderBrand /></Header>}>
      <ProfileIdentity initialName={fullName} email={user.email ?? ''} initialAvatarColor={user.user_metadata?.avatarColor ?? null} />

      <div className="flex gap-[9px] mt-5">
        {stats.map((stat) => (
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
        <DailyGoalStepper initialValue={userStats.metaDiariaCards} />
        <ThemeSwitchRow />
      </div>

      <div
        className="text-[11.5px] font-bold uppercase"
        style={{ color: 'var(--muted)', letterSpacing: '0.06em', margin: '24px 0 10px' }}
      >
        Segurança
      </div>
      <ChangePasswordForm />

      <div
        className="text-[11.5px] font-bold uppercase"
        style={{ color: 'var(--muted)', letterSpacing: '0.06em', margin: '24px 0 10px' }}
      >
        App
      </div>
      <div className="flex flex-col gap-2">
        <InstallAppRow />
        <div
          className="flex items-center gap-3 rounded-2xl"
          style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Info size={19} strokeWidth={1.9} style={{ color: 'var(--muted)' }} />
          <span className="flex-1 text-sm font-semibold">Sobre o Meus Flashcards</span>
          <ChevronRight size={17} style={{ color: 'var(--muted)' }} />
        </div>
        <LogoutButton />
        <DeleteAccountSection email={user.email ?? ''} />
      </div>
    </AppShell>
  )
}
