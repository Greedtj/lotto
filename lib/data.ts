import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import type { FormulaId } from '@/lib/formulas'
import { buildCdfTable, type CdfTable } from '@/lib/lottery/generate'
import { denseRank, periodRange } from '@/lib/lottery/rank'
import { DRAW_COLUMNS, fromRow, type DrawRow } from '@/lib/lottery/rows'
import { bangkokDate } from '@/lib/lottery/schedule'
import { CATEGORIES, type Category, type DrawResult, type NumberSet } from '@/lib/lottery/targets'

// Cache tags. Everything below changes only when a result arrives or an admin edits.
export const TAG = { results: 'results', schedule: 'schedule', scores: 'scores' } as const
export const PAGE_SIZE = 20

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

/** All resulted draws, oldest first. */
export async function getResultedDraws(): Promise<DrawResult[]> {
  'use cache'
  cacheTag(TAG.results)
  cacheLife('max')
  return fetchAllResulted()
}

/** Uncached read (PostgREST caps a response at 1000 rows, so page through). */
export async function fetchAllResulted(): Promise<DrawResult[]> {
  const rows: DrawRow[] = []
  for (let from = 0; ; from += 1000) {
    const page = must(await db.from('draws').select(DRAW_COLUMNS).eq('status', 'resulted').order('draw_date').range(from, from + 999)) as DrawRow[]
    rows.push(...page)
    if (page.length < 1000) break
  }
  return rows.map(fromRow)
}

// Measured on Vercel: 'use cache' reads from Server Actions still cost a DB-sized round trip,
// so the per-draw distributions are memoized in the function instance instead, keyed by the
// latest result change (every ingest / admin edit bumps draws.updated_at).
let cdfMemo: { version: string; table: Promise<CdfTable> } | null = null

async function resultsVersion(): Promise<string> {
  const row = must(await db.from('draws').select('updated_at').eq('status', 'resulted').order('updated_at', { ascending: false }).limit(1).single()) as { updated_at: string }
  return row.updated_at
}

/** Every formula's distributions for the next draw: identical for every player, so computed once per result change. */
export async function getCdfTable(): Promise<CdfTable> {
  const version = await resultsVersion()
  if (cdfMemo?.version !== version) {
    const table = fetchAllResulted().then(buildCdfTable)
    table.catch(() => (cdfMemo = null)) // don't keep a failed load
    cdfMemo = { version, table }
  }
  return cdfMemo.table
}

export async function getScheduledDraws(): Promise<string[]> {
  'use cache'
  cacheTag(TAG.schedule)
  cacheLife('max')
  const rows = must(await db.from('draws').select('draw_date').eq('status', 'scheduled').order('draw_date'))
  return rows.map((r) => r.draw_date)
}

export async function getLatestResult(): Promise<DrawResult | null> {
  return (await getResultedDraws()).at(-1) ?? null
}

/** Keyset page of results, newest first. */
export async function getResultsPage(before?: string) {
  'use cache'
  cacheTag(TAG.results)
  cacheLife('max')
  let q = db.from('draws').select(DRAW_COLUMNS).eq('status', 'resulted').order('draw_date', { ascending: false }).limit(PAGE_SIZE)
  if (before) q = q.lt('draw_date', before)
  const rows = (must(await q) as DrawRow[]).map(fromRow)
  return { rows, next: rows.length === PAGE_SIZE ? rows.at(-1)!.date : null }
}

export async function getDrawDates(): Promise<string[]> {
  return (await getResultedDraws()).map((d) => d.date).reverse()
}

export type PickRow = {
  draw_date: string
  formula: FormulaId
  numbers: NumberSet
  hits: Record<Category, boolean> | null
  result: DrawResult | null
}

/** Keyset page of one player's picks, newest first, with the draw result when there is one. */
export async function getMyPicksPage(playerId: number, before?: string) {
  let q = db
    .from('picks')
    .select(`draw_date,formula,numbers,hit_first,hit_top3,hit_top2,hit_front3,hit_back3,hit_last2,draws(${DRAW_COLUMNS})`)
    .eq('player_id', playerId)
    .order('draw_date', { ascending: false })
    .limit(PAGE_SIZE)
  if (before) q = q.lt('draw_date', before)
  const data = must(await q) as unknown as (Record<string, unknown> & { draws: DrawRow })[]
  const rows: PickRow[] = data.map((r) => ({
    draw_date: r.draw_date as string,
    formula: r.formula as FormulaId,
    numbers: r.numbers as NumberSet,
    hits: r.hit_first === null ? null : (Object.fromEntries(CATEGORIES.map((c) => [c, Boolean(r[`hit_${c}`])])) as Record<Category, boolean>),
    result: r.draws?.status === 'resulted' ? fromRow(r.draws) : null,
  }))
  return { rows, next: rows.length === PAGE_SIZE ? rows.at(-1)!.draw_date : null }
}

export type Standing = { player_id: number; username: string; played: number } & Record<Category, number>
export type Board = 'total' | Category

/** Leaderboard for a period; each tab ranks by its own points, ties share a rank. */
export async function getLeaderboard(period: string, board: Board) {
  'use cache'
  cacheTag(TAG.scores)
  cacheLife('max')
  const { from, to } = periodRange(period)
  const rows = must(await db.rpc('leaderboard', { p_from: from, p_to: to })) as Standing[]
  const score = (r: Standing) => (board === 'total' ? CATEGORIES.reduce((s, c) => s + r[c], 0) : r[board])
  return denseRank(rows, score)
}

/** A player's latest set per formula and pick for one draw, and whether today's roll is used. */
export async function getMyDraw(playerId: number, draw: string) {
  const [rolls, pick, today] = await Promise.all([
    db.from('rolls').select('id,formula,numbers').eq('player_id', playerId).eq('draw_date', draw).order('id'),
    db.from('picks').select('roll_id,formula,numbers').eq('player_id', playerId).eq('draw_date', draw).maybeSingle(),
    db.from('rolls').select('id').eq('player_id', playerId).eq('roll_day', bangkokDate(new Date())).limit(1),
  ])
  const latest = new Map<FormulaId, { id: number; formula: FormulaId; numbers: NumberSet }>()
  for (const r of must(rolls) as { id: number; formula: FormulaId; numbers: NumberSet }[]) latest.set(r.formula, r)
  return {
    rolls: latest,
    pick: must(pick) as { roll_id: number; formula: FormulaId; numbers: NumberSet } | null,
    rolledToday: (must(today) as unknown[]).length > 0,
  }
}

export async function getMyTotals(playerId: number) {
  const data = must(await db.from('picks').select('hit_first,hit_top3,hit_top2,hit_front3,hit_back3,hit_last2').eq('player_id', playerId).not('hit_first', 'is', null))
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, data.filter((r) => (r as Record<string, boolean>)[`hit_${c}`]).length])) as Record<Category, number>
  return { played: data.length, totals }
}
