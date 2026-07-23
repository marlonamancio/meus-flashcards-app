import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDisplayFirstName } from '@/lib/user-display'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { HeaderBrand } from '@/components/layout/HeaderBrand'
import { HeaderTitle } from '@/components/layout/HeaderTitle'

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default async function ProgressoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const displayName = getDisplayFirstName(user)

  return (
    <AppShell header={<Header displayName={displayName}><HeaderBrand /></Header>}>
      <div style={{ padding: '18px 0 2px' }}>
        <HeaderTitle title="Progresso" />
        <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
          Acompanhe sua evolução no estudo
        </div>
      </div>

      <div className="flex gap-[9px] mt-3.5">
        {[
          { label: 'dias de ofensiva', value: '0' },
          { label: 'revisões', value: '0' },
          { label: 'acerto médio', value: '—', color: 'var(--good)' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex-1 rounded-2xl"
            style={{ padding: '13px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className="text-[22px] font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div
        className="rounded-[18px]"
        style={{ marginTop: 14, padding: '16px 16px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
      >
        <div className="flex justify-between items-baseline">
          <h2 className="text-sm font-bold">Atividade da semana</h2>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            <span className="font-bold" style={{ color: 'var(--text)' }}>0</span> cards
          </span>
        </div>
        <div className="flex items-end gap-2 mt-4" style={{ height: 126 }}>
          {WEEK_LABELS.map((label) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5 h-full">
              <div className="flex-1 w-full flex flex-col justify-end items-center">
                <div className="w-full rounded-t" style={{ background: 'var(--surface-2)', height: 4 }} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-[14.5px] font-bold" style={{ margin: '24px 0 12px' }}>Evolução por coleção</h2>
      <div
        className="rounded-2xl text-center"
        style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
      >
        Nenhuma coleção com revisões ainda.
      </div>

      <div className="flex items-center gap-2 mt-6 mb-2.5">
        <AlertTriangle size={17} strokeWidth={2} style={{ color: 'var(--bad)' }} />
        <h2 className="text-[14.5px] font-bold">Onde você mais erra</h2>
      </div>
      <div
        className="rounded-2xl text-center"
        style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
      >
        Assim que você começar a estudar, os cards com mais erro aparecem aqui.
      </div>
    </AppShell>
  )
}
