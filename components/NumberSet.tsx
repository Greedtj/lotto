import { CATEGORY_LABEL, type Category, type NumberSet as Set } from '@/lib/lottery/targets'

const ORDER: Category[] = ['first', 'top3', 'front3', 'back3', 'top2', 'last2']

/** The 6-category set. first prize spans the row; hits (after scoring) are filled red. */
export function NumberSet({ set, hits }: { set: Set | null; hits?: Record<Category, boolean> | null }) {
  return (
    <div className={set ? 'set' : 'set set--empty'}>
      {ORDER.map((c) => (
        <div key={c} className={c === 'first' ? 'set__cell set__cell--wide' : 'set__cell'} data-hit={hits?.[c] ? 'true' : undefined}>
          <span className="label">
            {CATEGORY_LABEL[c]}
            {hits?.[c] && ' · ถูก'}
          </span>
          <span className="set__num">{set ? set[c] : c === 'first' ? '––––––' : c.endsWith('2') ? '––' : '–––'}</span>
        </div>
      ))}
    </div>
  )
}
