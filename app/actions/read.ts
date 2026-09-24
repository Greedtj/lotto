'use server'
// Read-only actions for client-side "load more" / ticket checks.
import { requirePlayer } from '@/lib/auth'
import { getMyPicksPage, getResultedDraws, getResultsPage } from '@/lib/data'
import { checkTicket } from '@/lib/lottery/check'

const DATE = /^\d{4}-\d{2}-\d{2}$/

export async function moreResultsAction(before: string) {
  await requirePlayer()
  if (!DATE.test(before)) throw new Error('bad cursor')
  return getResultsPage(before)
}

export async function morePicksAction(before: string) {
  const p = await requirePlayer()
  if (!DATE.test(before)) throw new Error('bad cursor')
  return getMyPicksPage(p.id, before)
}

export async function checkTicketAction(date: string, ticket: string) {
  await requirePlayer()
  const r = (await getResultedDraws()).find((d) => d.date === date)
  if (!r) return { error: 'ไม่พบงวดนี้' }
  try {
    return { result: r, check: checkTicket(ticket.trim(), r) }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
