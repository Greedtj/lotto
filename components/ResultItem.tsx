import { thaiDate } from '@/lib/format'
import type { DrawResult } from '@/lib/lottery/targets'

export function ResultItem({ r }: { r: DrawResult }) {
  return (
    <li>
      <div className="row">
        <span className="label">{thaiDate(r.date)}</span>
        <span className="big">{r.first}</span>
      </div>
      <div className="nums" style={{ marginTop: 'var(--space-2xs)' }}>
        {r.front3.length > 0 && <span>หน้า 3 ตัว {r.front3.join(' ')}</span>}
        <span>ท้าย 3 ตัว {r.back3.join(' ')}</span>
        <span>
          ท้าย 2 ตัว <b className="accent">{r.last2}</b>
        </span>
      </div>
    </li>
  )
}
