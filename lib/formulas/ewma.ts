import { norm, type Formula } from './util'

// Fixed up front — never tuned on backtest results.
export const EWMA_ALPHA = 0.05

/** Frequency with newer draws weighted more (exponential decay). */
export const ewma: Formula = (h, K) => {
  const w = new Array<number>(K).fill(0)
  const n = h.length
  h.forEach((draw, i) => {
    const weight = (1 - EWMA_ALPHA) ** (n - 1 - i)
    for (const v of draw) w[v] += weight
  })
  return norm(w.map((x) => x + 0.01))
}
