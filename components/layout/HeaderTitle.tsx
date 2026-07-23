export function HeaderTitle({ title }: { title: string }) {
  return (
    <h1 className="text-[23px] font-bold truncate" style={{ letterSpacing: '-0.02em' }}>
      {title}
    </h1>
  )
}
