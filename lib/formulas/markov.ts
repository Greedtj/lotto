import { digits, numDigits, perDigit, type Formula } from './util'

/**
 * Per-digit 10x10 transition chains (a full K-state matrix would be almost empty).
 * Draws with several values count every (previous value -> next value) pair,
 * and the next-state row is averaged over the last draw's values. `prior` = smoothing per cell.
 */
export const markov: Formula = (h, K, { prior }) => {
  const nd = numDigits(K)
  const ds = h.map((draw) => draw.map((v) => digits(v, nd)))
  const probs: number[][] = []
  for (let p = 0; p < nd; p++) {
    const m = Array.from({ length: 10 }, () => new Array<number>(10).fill(prior))
    for (let i = 1; i < ds.length; i++) for (const a of ds[i - 1]) for (const b of ds[i]) m[a[p]][b[p]]++
    const row = new Array<number>(10).fill(0)
    const last = ds[ds.length - 1]
    for (const a of last) {
      const r = m[a[p]]
      const s = r.reduce((x, y) => x + y, 0)
      r.forEach((x, j) => (row[j] += x / s / last.length))
    }
    probs.push(row)
  }
  return perDigit(K, probs)
}
