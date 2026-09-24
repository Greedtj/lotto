import { digits, numDigits, perDigit, type Formula } from './util'

/**
 * Dirichlet(prior) posterior predictive for each digit position, digits assumed independent.
 * `decay` > 0 down-weights old draws: weight = (1 - decay) ^ age.
 */
export const bayesDigit: Formula = (h, K, { prior, decay }) => {
  const nd = numDigits(K)
  const n = h.length
  const probs: number[][] = []
  for (let p = 0; p < nd; p++) {
    const c = new Array<number>(10).fill(prior)
    h.forEach((draw, i) => {
      const w = decay ? (1 - decay) ** (n - 1 - i) : 1
      for (const v of draw) c[digits(v, nd)[p]] += w
    })
    const s = c.reduce((a, b) => a + b, 0)
    probs.push(c.map((x) => x / s))
  }
  return perDigit(K, probs)
}
