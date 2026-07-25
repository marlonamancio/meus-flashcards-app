import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getDisplayFirstName, getUserAvatarPalette } from '@/lib/user-display'
import { getCollections, getOverallStats, getWeekActivity } from '@/lib/home-data'
import { getGlobalWeakCards } from '@/lib/progresso-data'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { HeaderBrand } from '@/components/layout/HeaderBrand'
import { HeaderTitle } from '@/components/layout/HeaderTitle'

export default async function ProgressoPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const displayName = getDisplayFirstName(user)
  const avatarPalette = getUserAvatarPalette(user)

  const [overall, week, collections, weakCards] = await Promise.all([
    getOverallStats(supabase, user.id),
    getWeekActivity(supabase, user.id),
    getCollections(supabase, user.id),
    getGlobalWeakCards(supabase, user.id),
  ])

  const evolvedCollections = collections.filter((c): c is typeof c & { accuracyPct: number } => c.accuracyPct !== null)
  const weekTotal = week.reduce((sum, d) => sum + d.cardsRevisados, 0)
  const maxDay = Math.max(1, ...week.map((d) => d.cardsRevisados))

  const stats = [
    { value: String(overall.streakAtual), label: overall.streakAtual === 1 ? 'dia de ofensiva' : 'dias de ofensiva' },
    { value: String(overall.totalReviews), label: 'revisões' },
    { value: overall.avgAccuracyPct !== null ? `${overall.avgAccuracyPct}%` : '—', label: 'acerto médio', color: 'var(--good)' },
  ]

  return (
    <AppShell header={<Header displayName={displayName} avatarPalette={avatarPalette}><HeaderBrand /></Header>}>
      <div style={{ padding: '18px 0 2px' }}>
        <HeaderTitle title="Progresso" />
        <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
          Acompanhe sua evolução no estudo
        </div>
      </div>

      <div className="flex gap-[9px] mt-3.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 rounded-2xl"
            style={{ padding: '13px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
          >
            <div className="text-[22px] font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
              {stat.label}
            </div>
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
            <span className="font-bold" style={{ color: 'var(--text)' }}>
              {weekTotal}
            </span>{' '}
            cards
          </span>
        </div>
        <div className="flex items-end gap-2 mt-4" style={{ height: 126 }}>
          {week.map((d, i) => {
            const barPct = Math.round((d.cardsRevisados / maxDay) * 100)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full">
                <span className="text-[10px] font-bold" style={{ color: d.isToday ? 'var(--accent-strong)' : 'var(--muted)' }}>
                  {d.cardsRevisados}
                </span>
                {/* height is a % of this flex-1 wrapper's own computed space, not the outer
                    126px — that space is already shorter than 126px once the day-count label
                    above and the weekday label below are accounted for, so an absolute pixel
                    height here (e.g. up to 126px for the tallest bar) would overflow this
                    column and break out of the card. The day-count label is a plain sibling
                    outside this wrapper, not nested inside it, for the same reason: nesting it
                    in here would shrink the wrapper's own available space without the bar's
                    percentage height ever accounting for that, reintroducing the same overflow. */}
                <div className="flex-1 w-full flex flex-col justify-end items-center">
                  <div
                    className="w-full rounded-t"
                    style={{ background: d.cardsRevisados > 0 ? 'var(--accent)' : 'var(--surface-2)', height: `${barPct}%`, minHeight: 4 }}
                  />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: d.isToday ? 'var(--accent-strong)' : 'var(--muted)' }}>
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <h2 className="text-[14.5px] font-bold" style={{ margin: '24px 0 12px' }}>
        Evolução por coleção
      </h2>
      {evolvedCollections.length === 0 ? (
        <div
          className="rounded-2xl text-center"
          style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
        >
          Nenhuma coleção com revisões ainda.
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {evolvedCollections.map((c) => (
            <div
              key={c.id}
              className="rounded-[14px]"
              style={{ padding: '13px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <div className="flex items-center gap-[11px]">
                <div
                  className="flex-none flex items-center justify-center rounded-[9px] text-xs font-bold"
                  style={{ width: 32, height: 32, background: c.soft, color: c.color }}
                >
                  {c.short}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold truncate">{c.nome}</div>
                  <div className="text-[11px] mt-px" style={{ color: 'var(--muted)' }}>
                    {c.cardCount} card{c.cardCount === 1 ? '' : 's'}
                  </div>
                </div>
                <span className="text-[15px] font-bold flex-none" style={{ color: c.color }}>
                  {c.accuracyPct}%
                </span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--surface-2)', marginTop: 11 }}>
                <div className="h-full rounded-full" style={{ background: c.color, width: `${c.accuracyPct}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-6 mb-2.5">
        <AlertTriangle size={17} strokeWidth={2} style={{ color: 'var(--bad)' }} />
        <h2 className="text-[14.5px] font-bold">Onde você mais erra</h2>
      </div>
      {weakCards.length === 0 ? (
        <div
          className="rounded-2xl text-center"
          style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
        >
          Assim que você começar a estudar, os cards com mais erro aparecem aqui.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {weakCards.map((c) => (
            <div key={c.id} className="rounded-[14px]" style={{ padding: '13px 14px', background: 'var(--bad-soft)' }}>
              <div className="flex items-center gap-[7px] mb-2">
                <span className="rounded-full flex-none" style={{ width: 7, height: 7, background: c.collectionColor }} />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
                  {c.collectionName}
                </span>
              </div>
              <div className="text-[13.5px] font-semibold" style={{ lineHeight: 1.4 }}>
                {c.frente}
              </div>
              <div className="flex items-center gap-2 mt-[9px]">
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(226,96,63,.2)' }}>
                  <div className="h-full rounded-full" style={{ background: 'var(--bad)', width: `${c.errorPct}%` }} />
                </div>
                <span className="text-[11.5px] font-bold flex-none" style={{ color: 'var(--bad)' }}>
                  {c.errorPct}% erro
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
