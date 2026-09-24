// Dense ranking: equal scores share a rank (1, 1, 2, …) as agreed for the leaderboard.
export function denseRank<T>(rows: T[], score: (r: T) => number): (T & { rank: number; score: number })[] {
  const sorted = [...rows].sort((a, b) => score(b) - score(a))
  let rank = 0
  let prev: number | null = null
  return sorted.map((r) => {
    const s = score(r)
    if (s !== prev) rank++
    prev = s
    return { ...r, rank, score: s }
  })
}

/** 'all' | 'YYYY' | 'YYYY-MM' -> inclusive date range. */
export function periodRange(period: string): { from: string; to: string } {
  if (/^\d{4}$/.test(period)) return { from: `${period}-01-01`, to: `${period}-12-31` }
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number)
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return { from: `${period}-01`, to: `${period}-${last}` }
  }
  return { from: '1900-01-01', to: '9999-12-31' }
}
