// One-time seed: 878 historical draws, GLO full prizes, next draw, admin accounts, backtest.
// Run: npm run seed   (flags: --skip-glo)
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import draws from '../research/draws.json'
import { fetchGloResult } from '../lib/glo'
import { backtestAll } from '../lib/lottery/backtest'
import { fromRow, toRow, DRAW_COLUMNS, type DrawRow } from '../lib/lottery/rows'
import { nextDefaultDrawDate } from '../lib/lottery/schedule'
import type { DrawResult } from '../lib/lottery/targets'

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
const must = <T>({ data, error }: { data: T; error: unknown }) => {
  if (error) throw error
  return data
}

async function main() {
  const hist = draws as DrawResult[]
  console.log(`draws: upserting ${hist.length} from myhora`)
  for (let i = 0; i < hist.length; i += 500)
    must(await db.from('draws').upsert(hist.slice(i, i + 500).map((d) => toRow(d, 'myhora')), { ignoreDuplicates: true }))

  if (!process.argv.includes('--skip-glo')) await backfillGlo(hist)

  const latest = hist.at(-1)!.date
  const next = nextDefaultDrawDate(latest)
  must(await db.from('draws').upsert({ draw_date: next, status: 'scheduled' }, { ignoreDuplicates: true }))
  console.log('next draw scheduled:', next)

  const pin = process.env.ADMIN_PIN
  for (const name of (process.env.ADMIN_USERNAMES ?? '').split(',').map((s) => s.trim().normalize('NFC')).filter(Boolean)) {
    if (!pin || !/^\d{4}$/.test(pin)) throw new Error('ADMIN_PIN must be 4 digits')
    const exists = must(await db.from('players').select('id').ilike('username', name).maybeSingle())
    if (!exists) must(await db.from('players').insert({ username: name, pin_hash: await bcrypt.hash(pin, 10) }))
    console.log('admin account:', name, exists ? '(exists)' : '(created)')
  }

  const rows = must(await db.from('draws').select(DRAW_COLUMNS).eq('status', 'resulted').order('draw_date')) as DrawRow[]
  const t0 = Date.now()
  const tally = backtestAll(rows.map(fromRow))
  must(await db.from('backtest').upsert({ id: 1, through_date: rows.at(-1)!.draw_date, tally }))
  console.log(`backtest: ${rows.length} draws in ${Date.now() - t0}ms`)
}

/** Fill 2nd–5th / near-first from GLO where its archive has the draw; stop trusting on any mismatch. */
async function backfillGlo(hist: DrawResult[]) {
  const candidates = hist.filter((d) => d.date >= '2006-01-01')
  let filled = 0
  const mismatches: string[] = []
  for (let i = 0; i < candidates.length; i += 4) {
    const batch = candidates.slice(i, i + 4)
    const results = await Promise.all(batch.map((d) => fetchGloResult(d.date).catch(() => null)))
    for (const [j, g] of results.entries()) {
      if (!g) continue
      const mine = batch[j]
      if (g.first !== mine.first || g.last2 !== mine.last2) {
        mismatches.push(`${mine.date}: myhora ${mine.first}/${mine.last2} vs glo ${g.first}/${g.last2}`)
        continue
      }
      must(await db.from('draws').update({ ...toRow(g, 'glo'), updated_at: new Date().toISOString() }).eq('draw_date', g.date))
      filled++
    }
    await new Promise((r) => setTimeout(r, 150)) // be polite
  }
  console.log(`glo: filled ${filled}/${candidates.length} draws`)
  if (mismatches.length) console.warn('glo mismatches (kept myhora):\n' + mismatches.join('\n'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
