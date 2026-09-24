import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requirePlayer } from '@/lib/auth'
import { getDrawDates } from '@/lib/data'
import { CheckForm } from './CheckForm'

export const metadata: Metadata = { title: 'ตรวจหวย' }

export default function CheckPage() {
  return (
    <main className="page">
      <div className="masthead">
        <span>ตรวจหวย</span>
        <span>สลากกินแบ่งรัฐบาล</span>
      </div>
      <h1 className="title riso">ตรวจ<span className="accent">สลาก</span></h1>
      <Suspense fallback={<p className="meta">กำลังโหลด…</p>}>
        <Form />
      </Suspense>
    </main>
  )
}

async function Form() {
  await requirePlayer()
  return <CheckForm dates={await getDrawDates()} />
}
