'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import { pickAction, refreshResultsAction, rollAction, type Roll } from '@/app/actions/play'
import { NumberSet } from '@/components/NumberSet'
import type { FormulaId } from '@/lib/formulas'
import type { NumberSet as Set } from '@/lib/lottery/targets'

export type FormulaCard = { id: FormulaId; name: string; desc: string; latest: Roll | null; used: number }
type Window = { state: 'open'; closesAt: string } | { state: 'waiting'; draw: string } | { state: 'none' }

type Picked = { rollId: number; formula: string; numbers: Set } | null

export function Play(props: { cards: FormulaCard[]; limit: number; picked: Picked; window: Window }) {
  const [cards, setCards] = useState(props.cards)
  const [picked, setPicked] = useState<Picked>(props.picked)
  const [errors, setErrors] = useState<Partial<Record<FormulaId, string>>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const open = props.window.state === 'open'

  useResultsRefresh(props.window)

  const setError = (id: FormulaId, e?: string) => setErrors((x) => ({ ...x, [id]: e }))

  function roll(id: FormulaId) {
    setBusy(`roll:${id}`)
    setError(id)
    startTransition(async () => {
      const r = await rollAction(id)
      setBusy(null)
      if (!r.ok) return setError(id, r.error)
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, latest: r.value, used: r.value.seq } : c)))
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

      <hr className="rule" />
      <h2 className="title">8 สูตร</h2>
      {cards.map((c) => {
        const left = props.limit - c.used
        const isPicked = c.latest !== null && c.latest.id === picked?.rollId
        return (
          <article key={c.id} className={isPicked ? 'card card--picked' : 'card'} aria-labelledby={`f-${c.id}`}>
            <div className="card__head">
              <h3 id={`f-${c.id}`} className="card__name">{c.name}</h3>
              {isPicked && <span className="badge">เลือกแล้ว</span>}
            </div>
            <p className="meta" style={{ margin: 0 }}>{c.desc}</p>
            <NumberSet set={c.latest?.numbers ?? null} />
            <div className="card__actions">
              <button className="btn" onClick={() => roll(c.id)} disabled={!open || left <= 0 || busy !== null} data-loading={busy === `roll:${c.id}`} aria-describedby={errors[c.id] ? `e-${c.id}` : undefined}>
                {busy === `roll:${c.id}` ? 'กำลังสุ่ม…' : c.used === 0 ? `สุ่ม (${left}/${props.limit})` : left > 0 ? `สุ่มใหม่ (${left}/${props.limit})` : 'สุ่มครบแล้ว'}
              </button>
              <button className={isPicked ? 'btn btn--done' : 'btn'} onClick={() => pick(c)} disabled={!open || !c.latest || isPicked}>
                {isPicked ? 'เลือกแล้ว ✓' : 'เลือกชุดนี้'}
              </button>
            </div>
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
