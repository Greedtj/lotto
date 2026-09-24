// Client for the Government Lottery Office (glo.or.th) result API.
import type { DrawResult } from '@/lib/lottery/targets'

const URL = 'https://www.glo.or.th/api/checking/getLotteryResult'

type GloPrize = { number: { value: string }[] }

/** Full result for one draw date, or null if GLO has none (not drawn yet / before its archive). */
export async function fetchGloResult(date: string): Promise<DrawResult | null> {
  const [year, month, day] = date.split('-')
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: day, month, year }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`GLO ${res.status}`)
  const body = await res.json()
  const r = body?.response?.result
  if (!r?.data || r.date !== date) return null
  const vals = (p?: GloPrize) => (p?.number ?? []).map((n) => n.value)
  const out: DrawResult = {
    date,
    first: vals(r.data.first)[0],
    front3: vals(r.data.last3f),
    back3: vals(r.data.last3b),
    last2: vals(r.data.last2)[0],
    second: vals(r.data.second),
    third: vals(r.data.third),
    fourth: vals(r.data.fourth),
    fifth: vals(r.data.fifth),
    near1: vals(r.data.near1),
  }
  return isComplete(out) ? out : null
}

/**
 * Only trust a result once every prize list is fully published; a "resulted" draw is never re-fetched.
 * front3+back3 = 4 fits both eras (0+4 before 2015, 2+2 after).
 */
export function isComplete(r: DrawResult): boolean {
  const n = (xs?: string[]) => xs?.length ?? 0
  return (
    /^\d{6}$/.test(r.first ?? '') &&
    /^\d{2}$/.test(r.last2 ?? '') &&
    r.front3.length + r.back3.length === 4 &&
    n(r.near1) === 2 && n(r.second) === 5 && n(r.third) === 10 && n(r.fourth) === 50 && n(r.fifth) === 100
  )
}
