// Check a lottery ticket against a draw's full result.
import type { DrawResult } from './targets'

export type Prize = { key: string; label: string; reward: number }

const PRIZES = {
  first: ['รางวัลที่ 1', 6_000_000],
  near1: ['รางวัลข้างเคียงรางวัลที่ 1', 100_000],
  second: ['รางวัลที่ 2', 200_000],
  third: ['รางวัลที่ 3', 80_000],
  fourth: ['รางวัลที่ 4', 40_000],
  fifth: ['รางวัลที่ 5', 20_000],
  front3: ['รางวัลเลขหน้า 3 ตัว', 4_000],
  back3: ['รางวัลเลขท้าย 3 ตัว', 4_000],
  last2: ['รางวัลเลขท้าย 2 ตัว', 2_000],
} as const

export type CheckResult = {
  prizes: Prize[]
  /** false = only main prizes are on record for this draw (no 2nd–5th / near-first). */
  fullCoverage: boolean
  digits: number
}

export function checkTicket(ticket: string, r: DrawResult): CheckResult {
  const digits = r.first.length
  if (!new RegExp(`^\\d{${digits}}$`).test(ticket)) throw new Error(`เลขสลากต้องเป็นตัวเลข ${digits} หลัก`)
  const full = Boolean(r.second?.length)
  const won = (key: keyof typeof PRIZES): Prize => ({ key, label: PRIZES[key][0], reward: PRIZES[key][1] })
  const prizes: Prize[] = []
  if (ticket === r.first) prizes.push(won('first'))
  for (const k of ['near1', 'second', 'third', 'fourth', 'fifth'] as const) if (r[k]?.includes(ticket)) prizes.push(won(k))
  if (r.front3.includes(ticket.slice(0, 3))) prizes.push(won('front3'))
  if (r.back3.includes(ticket.slice(-3))) prizes.push(won('back3'))
  if (ticket.slice(-2) === r.last2) prizes.push(won('last2'))
  return { prizes, fullCoverage: full, digits }
}
