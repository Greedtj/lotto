'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import { pickAction, refreshResultsAction, rollAllAction, type Roll } from '@/app/actions/play'
import { NumberSet } from '@/components/NumberSet'
import type { FormulaId } from '@/lib/formulas'
import type { RollStatus } from '@/lib/data'
import type { NumberSet as Set } from '@/lib/lottery/targets'

export type FormulaCard = { id: FormulaId; name: string; desc: string; latest: Roll | null }
type Window = { state: 'open'; closesAt: string } | { state: 'waiting'; draw: string } | { state: 'none' }

type Picked = { rollId: number; formula: string; numbers: Set } | null

export function Play(props: { cards: FormulaCard[]; rollStatus: RollStatus; picked: Picked; window: Window }) {
  const [cards, setCards] = useState(props.cards)
  const [used, setUsed] = useState(props.rollStatus.used)
  const perDay = props.rollStatus.per_day
  const left = perDay === null ? null : Math.max(0, perDay - used)
  const outOfRolls = left === 0
  const [picked, setPicked] = useState<Picked>(props.picked)
  const [rollError, setRollError] = useState<string>()
  const [errors, setErrors] = useState<Partial<Record<FormulaId, string>>>({})
  const [rolling, setRolling] = useState(false)
  const [, startTransition] = useTransition()
  const open = props.window.state === 'open'
  const hasSets = cards.some((c) => c.latest)

  useResultsRefresh(props.window)

  const setError = (id: FormulaId, e?: string) => setErrors((x) => ({ ...x, [id]: e }))

  /** One roll = one set from every formula; the daily allowance is the admin's roll policy. */
  function rollAll() {
    setRolling(true)
    setRollError(undefined)
    startTransition(async () => {
      const r = await rollAllAction()
      setRolling(false)
      if (!r.ok) {
        if (r.error.startsWith('ใช้สิทธิ์สุ่ม')) setUsed(perDay ?? used)
        return setRollError(r.error)
      }
      const byFormula = new Map(r.value.map((x) => [x.formula, x]))
      setCards((cs) => cs.map((c) => ({ ...c, latest: byFormula.get(c.id) ?? c.latest })))
      setUsed((u) => u + 1)
    })
  }

  function pick(c: FormulaCard) {
    if (!c.latest) return
    const before = picked
    setPicked({ rollId: c.latest.id, formula: c.name, numbers: c.latest.numbers }) // optimistic
    setError(c.id)
    startTransition(async () => {
      const r = await pickAction(c.latest!.id)
      if (!r.ok) {
        setPicked(before)
        setError(c.id, r.error)
      }
    })
  }

  return (
    <>
      <Status window={props.window} />
      <section aria-labelledby="picked-h" className="card card--picked">
        <div className="card__head">
          <h2 id="picked-h" className="card__name">ชุดที่เลือก</h2>
          <span className="meta">{picked ? `จากสูตร ${picked.formula}` : 'ยังไม่ได้เลือก'}</span>
        </div>
        <NumberSet set={picked?.numbers ?? null} />
        <p className="meta" style={{ margin: 0 }}>เลือกได้ 1 ชุดต่องวด กดเลือกชุดใหม่จะแทนชุดเดิม</p>
      </section>

      <button className="btn btn--primary btn--block" onClick={rollAll} disabled={!open || outOfRolls || rolling} data-loading={rolling} aria-describedby="roll-note">
        {rolling ? 'กำลังสุ่ม 8 สูตร…' : outOfRolls ? 'วันนี้สุ่มครบแล้ว' : left === null ? 'สุ่มเลข (ครบ 8 สูตร)' : `สุ่มเลข (เหลือ ${left}/${perDay})`}
      </button>
      <p className={rollError ? 'error' : 'meta'} id="roll-note" role={rollError ? 'alert' : undefined} style={{ marginTop: 'var(--space-xs)' }}>
        {rollError ??
          (outOfRolls
            ? 'สุ่มใหม่ได้พรุ่งนี้ 00:00 น. · ชุดด้านล่างยังเลือกได้จนปิดรับ'
            : `กด 1 ครั้ง ได้เลขจากทุกสูตรพร้อมกัน · ${perDay === null ? 'สุ่มได้ไม่จำกัด' : `วันละ ${perDay} ครั้ง`}`)}
      </p>

      <hr className="rule" />
      <h2 className="title">8 สูตร</h2>
      {!hasSets && <p className="muted">ยังไม่มีชุดเลขของงวดนี้ กดสุ่มด้านบนก่อน</p>}
      {cards.map((c) => {
        const isPicked = c.latest !== null && c.latest.id === picked?.rollId
        return (
          <article key={c.id} className={isPicked ? 'card card--picked' : 'card'} aria-labelledby={`f-${c.id}`}>
            <div className="card__head">
              <h3 id={`f-${c.id}`} className="card__name">{c.name}</h3>
              {isPicked && <span className="badge">เลือกแล้ว</span>}
            </div>
            <p className="meta" style={{ margin: 0 }}>{c.desc}</p>
            <NumberSet set={c.latest?.numbers ?? null} />
            <button className={isPicked ? 'btn btn--done btn--block' : 'btn btn--block'} onClick={() => pick(c)} disabled={!open || !c.latest || isPicked} aria-describedby={errors[c.id] ? `e-${c.id}` : undefined}>
              {isPicked ? 'เลือกแล้ว ✓' : 'เลือกชุดนี้'}
            </button>
            {errors[c.id] && <p className="error" id={`e-${c.id}`} role="alert" style={{ margin: 'var(--space-xs) 0 0' }}>{errors[c.id]}</p>}
          </article>
        )
      })}
    </>
  )
}

function Status({ window: w }: { window: Window }) {
  const now = useNow()
  if (w.state === 'none') return <p className="error" role="status">ยังไม่มีงวดถัดไปในระบบ รอ admin เปิดงวด</p>
  if (w.state === 'waiting') return <p className="error" role="status">ปิดรับแล้ว (14:00 น.) รอผลรางวัล ผลออกแล้วจะเปิดงวดถัดไปให้อัตโนมัติ</p>
  const ms = new Date(w.closesAt).getTime() - (now ?? 0)
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return (
    <p className="meta" role="status">
      ปิดรับวันหวยออก 14:00 น.{now !== null && ms > 0 && ` · เหลือ ${d > 0 ? `${d} วัน ` : ''}${h} ชม. ${m} นาที`}
    </p>
  )
}

/** Current time, ticking every 30s (null during SSR so the countdown doesn't cause hydration drift). */
const subscribeClock = (cb: () => void) => {
  const t = setInterval(cb, 30_000)
  return () => clearInterval(t)
}
const clockSnapshot = () => Math.floor(Date.now() / 30_000) * 30_000
function useNow() {
  return useSyncExternalStore(subscribeClock, clockSnapshot, () => null)
}

/** While waiting on a result, ask the server to pull it (after 16:00) instead of waiting for cron. */
function useResultsRefresh(w: Window) {
  const router = useRouter()
  useEffect(() => {
    if (w.state !== 'waiting' || Date.now() < new Date(`${w.draw}T16:00:00+07:00`).getTime()) return
    let stop = false
    const tick = async () => {
      const { updated } = await refreshResultsAction()
      if (updated && !stop) router.refresh()
    }
    tick()
    const t = setInterval(tick, 120_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [w, router])
}
