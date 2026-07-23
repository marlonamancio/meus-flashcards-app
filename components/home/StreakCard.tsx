import type { UserStats, WeekDay } from '@/lib/home-data'

export function StreakCard({ stats, week }: { stats: UserStats; week: WeekDay[] }) {
  const goalPct = stats.metaDiariaCards > 0
    ? Math.min(100, Math.round((stats.cardsEstudadosHoje / stats.metaDiariaCards) * 100))
    : 0

  return (
    <div
      className="mt-3.5 rounded-[18px]"
      style={{
        padding: '16px 17px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-none flex items-center justify-center" style={{ width: 56, height: 56 }}>
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 48,
              height: 48,
              background: 'radial-gradient(120% 120% at 30% 20%, var(--accent), var(--accent-strong))',
              boxShadow: '0 8px 20px var(--accent-soft), inset 0 1px 2px rgba(255,255,255,.35)',
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path
                fill="var(--on-accent)"
                d="M12.7 1.3c.3 3.2-1.4 4.9-2.4 6.6-.6 1-.9 1.9-.6 2.9-1-.2-1.9-1-2.4-2.2C5.7 10.3 4.5 12.6 4.5 15c0 4.3 3.4 7.5 7.5 7.5s7.5-3.2 7.5-7.5c0-3.6-2.3-6.6-4.2-9-1-1.2-1.7-2.6-2.6-4.7Z"
              />
              <path
                fill="var(--accent)"
                d="M12 22.5c-2.4 0-4.4-1.8-4.4-4.3 0-2 1.3-3.5 2.3-4.8.3.9.9 1.4 1.7 1.6-.3-1.6.5-2.9 1.4-4 .1 1.1.7 1.8 1.4 2.6 1 1.1 2 2.4 2 4.6 0 2.5-2 4.3-4.4 4.3Z"
              />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold" style={{ letterSpacing: '-0.02em' }}>
              {stats.streakAtual}
            </span>
            <span className="text-[13.5px] font-semibold" style={{ color: 'var(--muted)' }}>
              dias de ofensiva
            </span>
          </div>
          <div className="text-xs mt-px" style={{ color: 'var(--muted)' }}>
            {stats.streakRecorde > 0
              ? `Seu recorde é ${stats.streakRecorde} dias. Continue!`
              : 'Comece hoje a sua ofensiva!'}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mt-3.5 mb-1">
        {week.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-[5px]">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 26,
                height: 26,
                background: d.completed ? 'var(--accent)' : 'var(--surface-2)',
                boxShadow: d.isToday ? '0 0 0 2px var(--accent)' : 'none',
              }}
            >
              {d.completed && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </div>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>

      <div className="h-px my-3.5" style={{ background: 'var(--border)' }} />

      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[13px] font-semibold">Meta de hoje</span>
        <span className="text-[13px] font-bold">
          <span style={{ color: 'var(--accent-strong)' }}>{stats.cardsEstudadosHoje}</span>
          {' '}/ {stats.metaDiariaCards} cards
        </span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ height: 8, background: 'var(--surface-2)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${goalPct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-strong))' }}
        />
      </div>
    </div>
  )
}
