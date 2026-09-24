import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { PickItem } from '@/components/PickItem'
import { ResultItem } from '@/components/ResultItem'
import { requirePlayer } from '@/lib/auth'
import { getMyPicksPage, getResultsPage } from '@/lib/data'
import { LoadMore } from './LoadMore'

export const metadata: Metadata = { title: 'ประวัติ' }

export default function HistoryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  return (
    <main className="page">
      <div className="masthead">
        <span>ประวัติ</span>
        <span>ทุกงวดย้อนหลัง</span>
      </div>
      <h1 className="title riso">ประวัติ</h1>
      <Suspense fallback={<p className="meta">กำลังโหลด…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Content({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const player = await requirePlayer()
  const mine = (await searchParams).tab === 'mine'
  return (
    <>
      <nav className="tabs" aria-label="ประเภทประวัติ">
        <Link className="tab" href="/history" aria-current={mine ? undefined : 'page'}>ผลหวยจริง</Link>
        <Link className="tab" href="/history?tab=mine" aria-current={mine ? 'page' : undefined}>เลขที่ฉันเลือก</Link>
      </nav>
      {mine ? <Mine playerId={player.id} /> : <Results />}
    </>
  )
}

async function Results() {
  const page = await getResultsPage()
  return (
    <ul className="list">
      {page.rows.map((r) => <ResultItem key={r.date} r={r} />)}
      <LoadMore kind="results" next={page.next} />
    </ul>
  )
}

async function Mine({ playerId }: { playerId: number }) {
  const page = await getMyPicksPage(playerId)
  if (!page.rows.length) return <p className="muted">ยังไม่เคยเลือกเลข ไปที่แท็บสุ่มเพื่อเลือกชุดแรก</p>
  return (
    <ul className="list">
      {page.rows.map((p) => <PickItem key={p.draw_date} p={p} />)}
      <LoadMore kind="mine" next={page.next} />
    </ul>
  )
}
