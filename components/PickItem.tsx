import { NumberSet } from '@/components/NumberSet'
import type { PickRow } from '@/lib/data'
import { FORMULAS } from '@/lib/formulas'
import { thaiDate } from '@/lib/format'
import { CATEGORIES } from '@/lib/lottery/targets'

export function PickItem({ p }: { p: PickRow }) {
  const pts = p.hits ? CATEGORIES.filter((c) => p.hits![c]).length : null
  return (
    <li>
      <div className="row">
        <span className="label">{thaiDate(p.draw_date)}</span>
        <span className="meta">{pts === null ? 'รอผล' : `${pts} แต้ม`}</span>
      </div>
      <p className="meta" style={{ margin: 'var(--space-2xs) 0 0' }}>สูตร {FORMULAS[p.formula]?.name ?? p.formula}</p>
      <NumberSet set={p.numbers} hits={p.hits} />
      {p.result && <p className="meta" style={{ margin: 0 }}>ผลจริง: {p.result.first} · ท้าย 2 ตัว {p.result.last2}</p>}
    </li>
  )
}
