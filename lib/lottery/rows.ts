// DB row <-> DrawResult mapping for public.draws.
import type { DrawResult } from './targets'

export type DrawRow = {
  draw_date: string
  status: 'scheduled' | 'resulted'
  first: string | null
  front3: string[]
  back3: string[]
  last2: string | null
  second: string[] | null
  third: string[] | null
  fourth: string[] | null
  fifth: string[] | null
  near1: string[] | null
  source: 'myhora' | 'glo' | 'admin' | null
}

export const DRAW_COLUMNS = 'draw_date,status,first,front3,back3,last2,second,third,fourth,fifth,near1,source'

export function fromRow(r: DrawRow): DrawResult {
  return {
    date: r.draw_date, first: r.first!, front3: r.front3, back3: r.back3, last2: r.last2!,
    second: r.second ?? undefined, third: r.third ?? undefined, fourth: r.fourth ?? undefined,
    fifth: r.fifth ?? undefined, near1: r.near1 ?? undefined,
  }
}

export function toRow(r: DrawResult, source: DrawRow['source']): Omit<DrawRow, 'status'> & { status: 'resulted' } {
  return {
    draw_date: r.date, status: 'resulted', first: r.first, front3: r.front3, back3: r.back3, last2: r.last2,
    second: r.second ?? null, third: r.third ?? null, fourth: r.fourth ?? null, fifth: r.fifth ?? null,
    near1: r.near1 ?? null, source,
  }
}
