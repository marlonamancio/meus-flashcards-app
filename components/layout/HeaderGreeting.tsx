const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })

function formatToday(): string {
  const today = new Date()
  const weekday = WEEKDAY_FORMATTER.format(today)
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${capitalized}, ${DATE_FORMATTER.format(today)}`
}

export function HeaderGreeting({ displayName }: { displayName: string | null }) {
  const greeting = displayName ? `Olá, ${displayName}` : 'Olá!'

  return (
    <div>
      <div className="text-[12.5px] font-medium" style={{ color: 'var(--muted)' }}>
        {formatToday()}
      </div>
      <div className="text-[23px] font-bold mt-[3px] truncate" style={{ letterSpacing: '-0.02em' }}>
        {greeting}
      </div>
    </div>
  )
}
