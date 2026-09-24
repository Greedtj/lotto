'use client'
import { useState, useTransition } from 'react'
import { morePicksAction, moreResultsAction } from '@/app/actions/read'
import { PickItem } from '@/components/PickItem'
import { ResultItem } from '@/components/ResultItem'
import type { PickRow } from '@/lib/data'
import type { DrawResult } from '@/lib/lottery/targets'

/** Appends keyset pages below the server-rendered first page. */
export function LoadMore({ kind, next }: { kind: 'results' | 'mine'; next: string | null }) {
  const [items, setItems] = useState<(DrawResult | PickRow)[]>([])
  const [cursor, setCursor] = useState(next)
  const [error, setError] = useState(false)
  const [pending, start] = useTransition()

  const load = () =>
    start(async () => {
      try {
        const page = kind === 'results' ? await moreResultsAction(cursor!) : await morePicksAction(cursor!)
        setItems((xs) => [...xs, ...page.rows])
        setCursor(page.next)
        setError(false)
      } catch {
        setError(true)
      }
    })

  return (
    <>
      {items.map((x) => (kind === 'results' ? <ResultItem key={(x as DrawResult).date} r={x as DrawResult} /> : <PickItem key={(x as PickRow).draw_date} p={x as PickRow} />))}
      {cursor && (
        <li style={{ borderBottom: 0 }}>
          {error && <p className="error" role="alert">โหลดไม่สำเร็จ ลองอีกครั้ง</p>}
          <button className="btn btn--block" onClick={load} disabled={pending} data-loading={pending}>
            {pending ? 'กำลังโหลด…' : 'ดูเพิ่ม'}
          </button>
        </li>
      )}
    </>
  )
}
