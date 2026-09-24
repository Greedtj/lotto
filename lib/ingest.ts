import 'server-only'
import { db } from '@/lib/db'
import { fetchGloResult } from '@/lib/glo'
import { backtestAdd, backtestAll, type BacktestTable } from '@/lib/lottery/backtest'
import { fetchAllResulted } from '@/lib/data'
import { toRow } from '@/lib/lottery/rows'
import { bangkokDate, nextDefaultDrawDate } from '@/lib/lottery/schedule'
import { scoreSet } from '@/lib/lottery/scoring'
import type { DrawResult, NumberSet } from '@/lib/lottery/targets'

// Callers invalidate cache tags (results, schedule, scores) after these run.

/** Results are announced ~16:00 Bangkok; don't hammer GLO before that. */
const resultsDueAt = (date: string) => new Date(`${date}T16:00:00+07:00`)

async function check<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  return data as T
}

/** Store a result, score its picks, keep the next draw scheduled, update the backtest. Idempotent. */
export async function ingestResult(r: DrawResult, source: 'glo' | 'admin') {
  await check(db.from('draws').upsert({ ...toRow(r, source), updated_at: new Date().toISOString() }))

  const picks = await check(db.from('picks').select('player_id,numbers').eq('draw_date', r.date))
  await Promise.all(
    (picks as { player_id: number; numbers: NumberSet }[]).map((p) => {
      const h = scoreSet(p.numbers, r)
      return check(
        db.from('picks').update({
          hit_first: h.first, hit_top3: h.top3, hit_top2: h.top2, hit_front3: h.front3, hit_back3: h.back3, hit_last2: h.last2,
        }).eq('player_id', p.player_id).eq('draw_date', r.date),
      )
    }),
  )

  const upcoming = await check(db.from('draws').select('draw_date').eq('status', 'scheduled').gt('draw_date', r.date).limit(1))
  if (!upcoming.length) await check(db.from('draws').insert({ draw_date: nextDefaultDrawDate(r.date), status: 'scheduled' }))

  await updateBacktest(r)
  return { scored: picks.length }
}

/** Add one step when the new draw extends the table; otherwise (admin correction) rebuild. */
async function updateBacktest(r: DrawResult) {
  const all = await fetchAllResulted()
  const bt = await check<{ through_date: string; tally: BacktestTable } | null>(db.from('backtest').select('through_date,tally').eq('id', 1).maybeSingle())
  const i = all.findIndex((d) => d.date === r.date)
  const extends1 = bt && i === all.length - 1 && i > 0 && bt.through_date === all[i - 1].date
  const tally = extends1 ? backtestAdd(bt.tally, all.slice(0, i), r) : backtestAll(all)
  await check(db.from('backtest').upsert({ id: 1, through_date: all.at(-1)!.date, tally, updated_at: new Date().toISOString() }))
}

/** Fetch from GLO and ingest every scheduled draw whose results should be out. */
export async function ingestDue(now = new Date()) {
  const due = (await check(db.from('draws').select('draw_date').eq('status', 'scheduled').lte('draw_date', bangkokDate(now))))
    .map((d) => d.draw_date as string)
    .filter((d) => now >= resultsDueAt(d))
  const done: string[] = []
  for (const date of due) {
    const r = await fetchGloResult(date)
    if (r) {
      await ingestResult(r, 'glo')
      done.push(date)
    }
  }
  return { due, done }
}
