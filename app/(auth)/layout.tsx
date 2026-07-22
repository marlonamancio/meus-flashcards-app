export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-4"
         style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
