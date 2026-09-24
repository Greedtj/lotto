import { norm, type Formula } from './util'

/** Frequency with newer draws weighted more: weight = (1 - alpha) ^ age. */
export const ewma: Formula = (h, K, { alpha }) => {
  const w = new Array<number>(K).fill(0)
  const n = h.length
  h.forEach((draw, i) => {
    const weight = (1 - alpha) ** (n - 1 - i)
    for (const v of draw) w[v] += weight
  })
  return norm(w.map((x) => x + 0.01))
}
