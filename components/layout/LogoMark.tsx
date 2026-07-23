export function LogoMark({ size = 24 }: { size?: 24 | 52 }) {
  if (size === 52) {
    return (
      <div className="relative" style={{ width: 52, height: 52 }}>
        <div
          className="absolute rounded-[13px]"
          style={{ inset: '5px 12px 10px 2px', background: 'var(--accent-soft)', border: '2px solid var(--accent)', transform: 'rotate(-8deg)' }}
        />
        <div
          className="absolute rounded-[13px]"
          style={{ inset: '10px 2px 5px 12px', background: 'var(--accent)', boxShadow: '0 6px 16px var(--accent-soft)' }}
        />
      </div>
    )
  }

  return (
    <div className="relative flex-none" style={{ width: 24, height: 24 }}>
      <div
        className="absolute rounded-[6px]"
        style={{ inset: '3px 6px 5px 2px', background: 'var(--accent-soft)', border: '1.5px solid var(--accent)', transform: 'rotate(-8deg)' }}
      />
      <div className="absolute rounded-[6px]" style={{ inset: '5px 2px 3px 6px', background: 'var(--accent)' }} />
    </div>
  )
}
