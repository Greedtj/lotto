import { counts, gaps, norm, type Formula } from './util'

/** P(value "due") = 1 - exp(-rate * (gap + 1)), rate = smoothed frequency per value drawn. */
export const poissonGap: Formula = (h, K) => {
  const total = h.reduce((a, d) => a + d.length, 0)
  const cnt = counts(h, K)
  const gap = gaps(h, K)
  return norm(cnt.map((c, v) => 1 - Math.exp(-((c + 1) / (total + K)) * (gap[v] + 1))))
}
