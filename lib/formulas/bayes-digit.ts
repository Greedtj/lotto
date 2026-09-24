import { digits, numDigits, perDigit, type Formula } from './util'

/** Dirichlet(1) posterior predictive for each digit position, digits assumed independent. */
export const bayesDigit: Formula = (h, K) => {
  const nd = numDigits(K)
  const probs: number[][] = []
  for (let p = 0; p < nd; p++) {
    const c = new Array<number>(10).fill(1)
    for (const draw of h) for (const v of draw) c[digits(v, nd)[p]]++
    const s = c.reduce((a, b) => a + b, 0)
    probs.push(c.map((x) => x / s))
  }
  return perDigit(K, probs)
}
