'use server'
import { updateTag } from 'next/cache'
import { requirePlayer } from '@/lib/auth'
import { getCdfTable, getScheduledDraws, TAG } from '@/lib/data'
import { db } from '@/lib/db'
import { FORMULA_IDS, type FormulaId } from '@/lib/formulas'
import { ingestDue } from '@/lib/ingest'
import { generateSet } from '@/lib/lottery/generate'
import { pickWindow } from '@/lib/lottery/schedule'
import type { NumberSet } from '@/lib/lottery/targets'

export type Roll = { id: number; formula: FormulaId; numbers: NumberSet }
type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const ERRORS: Record<string, string> = {
  draw_closed: 'ปิดรับเลขงวดนี้แล้ว',
  rolled_today: 'วันนี้สุ่มไปแล้ว สุ่มใหม่ได้พรุ่งนี้ 00:00 น.',
  roll_not_found: 'ไม่พบชุดเลขนี้',
  '23505': 'วันนี้สุ่มไปแล้ว สุ่มใหม่ได้พรุ่งนี้ 00:00 น.', // two tabs raced for today's roll
}
const fail = (e: { message?: string; code?: string }) => ({ ok: false as const, error: ERRORS[e.message ?? ''] ?? ERRORS[e.code ?? ''] ?? 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' })

async function openDraw() {
  const w = pickWindow((await getScheduledDraws()).map((date) => ({ date, resulted: false })), new Date())
  return w.state === 'open' ? w.draw : null
}

/** Today's single roll: one set from every formula. */
export async function rollAllAction(): Promise<Result<Roll[]>> {
  const t0 = performance.now()
  const player = await requirePlayer()
  const [draw, table] = await Promise.all([openDraw(), getCdfTable()])
  if (!draw) return { ok: false, error: ERRORS.draw_closed }
  const t1 = performance.now()
  const sets = Object.fromEntries(FORMULA_IDS.map((id) => [id, generateSet(table[id])]))
  const { data, error } = await db.rpc('create_roll_batch', { p_player_id: player.id, p_draw_date: draw, p_sets: sets })
  const ms = (a: number, b: number) => Math.round(b - a)
  console.info(`[roll] ${ms(t0, performance.now())}ms (prep ${ms(t0, t1)} db ${ms(t1, performance.now())})`)
  if (error) return fail(error)
  return { ok: true, value: (data as { id: number; formula: FormulaId; numbers: NumberSet }[]) }
}

export async function pickAction(rollId: number): Promise<Result<{ rollId: number }>> {
  const t0 = performance.now()
  const player = await requirePlayer()
  const { error } = await db.rpc('save_pick', { p_player_id: player.id, p_roll_id: rollId })
  console.info(`[pick] ${Math.round(performance.now() - t0)}ms`)
  if (error) return fail(error)
  return { ok: true, value: { rollId } }
}

// ponytail: per-instance throttle; enough to stop one busy page from hammering GLO.
let lastRefresh = 0

/** Called by the page when picks are closed and results should be out: pull them now instead of waiting for cron. */
export async function refreshResultsAction(): Promise<{ updated: boolean }> {
  await requirePlayer()
  if (Date.now() - lastRefresh < 60_000) return { updated: false }
  lastRefresh = Date.now()
  const { done } = await ingestDue()
  if (done.length) Object.values(TAG).forEach(updateTag)
  return { updated: done.length > 0 }
}
