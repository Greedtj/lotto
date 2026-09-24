// Draw schedule and pick window. Always Bangkok time (UTC+7, no DST); servers run in UTC.

export const LOCK_TIME = '14:00:00'
const BKK_OFFSET_MS = 7 * 3600_000

export type DrawSlot = { date: string; resulted: boolean }

/** When picks close for a draw: 14:00 Bangkok on draw day. */
export const lockAt = (date: string) => new Date(`${date}T${LOCK_TIME}+07:00`)

/** Bangkok calendar date (YYYY-MM-DD) of an instant. */
export const bangkokDate = (now: Date) => new Date(now.getTime() + BKK_OFFSET_MS).toISOString().slice(0, 10)

/** Default next draw: the next 1st or 16th strictly after `date`. Admins move special dates by hand. */
export function nextDefaultDrawDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (d < 16) return `${y}-${String(m).padStart(2, '0')}-16`
  const nm = m === 12 ? 1 : m + 1
  return `${m === 12 ? y + 1 : y}-${String(nm).padStart(2, '0')}-01`
}

export type PickWindow =
  | { state: 'open'; draw: string; closesAt: Date }
  | { state: 'waiting'; draw: string } // past 14:00, result not in yet
  | { state: 'none' } // no upcoming draw scheduled

/**
 * Which draw a pick goes to right now.
 * Any unresulted draw whose lock time has passed blocks picking until its result arrives.
 */
export function pickWindow(draws: DrawSlot[], now: Date): PickWindow {
  const pending = draws.filter((d) => !d.resulted).sort((a, b) => a.date.localeCompare(b.date))
  const waiting = pending.find((d) => lockAt(d.date) <= now)
  if (waiting) return { state: 'waiting', draw: waiting.date }
  const next = pending[0]
  return next ? { state: 'open', draw: next.date, closesAt: lockAt(next.date) } : { state: 'none' }
}
