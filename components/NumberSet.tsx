import type { Category, NumberSet as Set } from '@/lib/lottery/targets'

type Hits = Record<Category, boolean> | null | undefined

/**
 * A set reads like a real ticket: the first prize, whose last 3 / 2 digits are 3 ตัวบน / 2 ตัวบน,
 * plus 3 ตัวหน้า, 3 ตัวท้าย, 2 ตัวล่าง. Hits (after scoring) are filled red.
 */
export function NumberSet({ set, hits }: { set: Set | null; hits?: Hits }) {
  const first = set?.first ?? '––––––'
  const hit = (c: Category) => (hits?.[c] ? 'true' : undefined)
  return (
    <div className={set ? 'set' : 'set set--empty'}>
      <div className="set__cell set__cell--wide" data-hit={hit('first')}>
        <span className="label">รางวัลที่ 1{hits?.first && ' · ถูก'}</span>
        <span className="set__num" aria-label={set ? `รางวัลที่ 1 ${first}` : 'ยังไม่มีเลข'}>
          {first.slice(0, 3)}
          <span className="set__tail">{first.slice(3)}</span>
        </span>
        <span className="set__tails">
          <span data-hit={hit('top3')}>3 ตัวบน <b>{set ? set.top3 : '–––'}</b>{hits?.top3 && ' ✓'}</span>
          <span data-hit={hit('top2')}>2 ตัวบน <b>{set ? set.top2 : '––'}</b>{hits?.top2 && ' ✓'}</span>
        </span>
      </div>
      {(
        [
          ['front3', '3 ตัวหน้า', '–––'],
          ['back3', '3 ตัวท้าย', '–––'],
          ['last2', '2 ตัวล่าง', '––'],
        ] as const
      ).map(([c, label, blank]) => (
        <div key={c} className="set__cell" data-hit={hit(c)}>
          <span className="label">
            {label}
            {hits?.[c] && ' · ถูก'}
          </span>
          <span className="set__num">{set ? set[c] : blank}</span>
        </div>
      ))}
    </div>
  )
}
