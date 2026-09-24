import { Suspense } from 'react'
import { getMyDraw, getScheduledDraws } from '@/lib/data'
import { requirePlayer } from '@/lib/auth'
import { FORMULAS, FORMULA_IDS } from '@/lib/formulas'
import { thaiDate } from '@/lib/format'
import { pickWindow } from '@/lib/lottery/schedule'
import { Play, type FormulaCard } from './Play'

export default function PlayPage() {
  return (
    <main className="page">
      <div className="masthead">
        <span>สุ่มเลข</span>
        <span>1 ชุดต่องวด</span>
      </div>
      <Suspense fallback={<p className="meta">กำลังโหลด…</p>}>
        <Board />
      </Suspense>
    </main>
  )
}

const LIMIT = Number(process.env.ROLLS_PER_FORMULA ?? 3)

async function Board() {
  const player = await requirePlayer()
  const w = pickWindow((await getScheduledDraws()).map((date) => ({ date, resulted: false })), new Date())
  const draw = w.state === 'none' ? null : w.draw
  const mine = draw ? await getMyDraw(player.id, draw) : { rolls: [], pick: null }

  const cards: FormulaCard[] = FORMULA_IDS.map((id) => {
    const rolls = mine.rolls.filter((r) => r.formula === id)
    return { id, name: FORMULAS[id].name, desc: FORMULAS[id].desc, latest: rolls.at(-1) ?? null, used: rolls.length }
  })

  return (
    <>
      <h1 className="title">
        <span className="riso">งวด</span> <span className="accent">{draw ? thaiDate(draw) : '—'}</span>
      </h1>
      <Play
        key={draw ?? 'none'}
        cards={cards}
        limit={LIMIT}
        picked={mine.pick ? { rollId: mine.pick.roll_id, formula: FORMULAS[mine.pick.formula].name, numbers: mine.pick.numbers } : null}
        window={w.state === 'open' ? { state: 'open', closesAt: w.closesAt.toISOString() } : w.state === 'waiting' ? { state: 'waiting', draw: w.draw } : { state: 'none' }}
      />
    </>
  )
}
