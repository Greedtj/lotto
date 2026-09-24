import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { requirePlayer } from '@/lib/auth'
import { getLeaderboard, type Board } from '@/lib/data'
import { bangkokDate } from '@/lib/lottery/schedule'
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/lottery/targets'

export const metadata: Metadata = { title: 'อันดับ' }

type Params = Promise<{ board?: string; period?: string }>
const BOARDS: { id: Board; label: string }[] = [{ id: 'total', label: 'รวม' }, ...CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABEL[c] }))]

export default function RankPage({ searchParams }: { searchParams: Params }) {
  return (
    <main className="page">
      <div className="masthead">
        <span>อันดับ</span>
        <span>ถูก 1 หมวด = 1 แต้ม</span>
      </div>
      <h1 className="title riso">ใครแม่น<span className="accent">สุด</span></h1>
      <Suspense fallback={<p className="meta">กำลังโหลด…</p>}>
        <Table searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function Table({ searchParams }: { searchParams: Params }) {
  const me = await requirePlayer()
  const sp = await searchParams
  const board = (BOARDS.find((b) => b.id === sp.board)?.id ?? 'total') as Board
  const today = bangkokDate(new Date())
  const periods = [
    { id: 'all', label: 'ตลอดกาล' },
    { id: today.slice(0, 4), label: 'ปีนี้' },
    { id: today.slice(0, 7), label: 'เดือนนี้' },
  ]
  const period = periods.find((p) => p.id === sp.period)?.id ?? 'all'
  const rows = await getLeaderboard(period, board)
  const href = (b: string, p: string) => `/rank?board=${b}&period=${p}`

  return (
    <>
      <nav className="tabs" aria-label="ช่วงเวลา">
        {periods.map((p) => (
          <Link key={p.id} className="tab" href={href(board, p.id)} aria-current={p.id === period ? 'page' : undefined}>{p.label}</Link>
        ))}
      </nav>
      <nav className="tabs" aria-label="หมวดรางวัล">
        {BOARDS.map((b) => (
          <Link key={b.id} className="tab" href={href(b.id, period)} aria-current={b.id === board ? 'page' : undefined}>{b.label}</Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="muted">ยังไม่มีงวดที่ประกาศผลในช่วงนี้</p>
      ) : (
        <table className="board">
          <caption className="sr-only">อันดับ {BOARDS.find((b) => b.id === board)!.label}</caption>
          <thead>
            <tr>
              <th scope="col">อันดับ</th>
              <th scope="col">ชื่อ</th>
              <th scope="col" className="num">งวดที่ร่วม</th>
              <th scope="col" className="num">แต้ม</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player_id} data-me={r.player_id === me.id}>
                <td className="board__rank">{r.rank}{rows.filter((x) => x.rank === r.rank).length > 1 && <span className="meta"> ร่วม</span>}</td>
                <td>{r.username}</td>
                <td className="num">{r.played}</td>
                <td className="num">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
