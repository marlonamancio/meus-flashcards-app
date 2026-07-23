import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getHomeData } from '@/lib/home-data'
import { getDisplayFirstName } from '@/lib/user-display'
import { AppShell } from '@/components/layout/AppShell'
import { HeaderGreeting } from '@/components/layout/HeaderGreeting'
import { StreakCard } from '@/components/home/StreakCard'
import { BadgesRow } from '@/components/home/BadgesRow'
import { CollectionsList } from '@/components/home/CollectionsList'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const displayName = getDisplayFirstName(user)
  const { stats, week, badges, collections } = await getHomeData(user.id)

  return (
    <AppShell displayName={displayName} header={<HeaderGreeting displayName={displayName} />}>
      <StreakCard stats={stats} week={week} />
      <BadgesRow badges={badges} />
      <CollectionsList collections={collections} />
    </AppShell>
  )
}
