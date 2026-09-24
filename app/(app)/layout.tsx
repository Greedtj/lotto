import { Suspense } from 'react'
import { Avatar } from '@/components/Avatar'
import { BottomNav } from '@/components/BottomNav'
import { getPlayer } from '@/lib/auth'

async function NavAvatar() {
  const p = await getPlayer()
  return <Avatar name={p?.name ?? '?'} />
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav avatar={<Suspense fallback={<Avatar name="·" />}><NavAvatar /></Suspense>} />
    </>
  )
}
