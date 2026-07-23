export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh flex flex-col justify-center sm:items-center sm:justify-center px-6 py-8 sm:p-4"
         style={{ background: 'var(--bg)' }}>
      <div className="w-full sm:max-w-sm">
        {children}
      </div>
    </div>
  )
}
