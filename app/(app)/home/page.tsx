import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
        Olá, {user.email?.split('@')[0]}!
      </h1>
      <p className="text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>
        Em construção — em breve seus flashcards aqui.
      </p>
    </main>
  )
}
