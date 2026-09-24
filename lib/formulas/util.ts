// Shared helpers. A formula is f(history, K, params) -> probability vector of length K (sums to 1, no zeros).
// history: one list of values per draw, oldest first (most targets have 1 value per draw).
export type Params = Record<string, number>
export type Formula = (history: number[][], K: number, p: Params) => number[]

/** Normalize and mix in a little uniform so no value is ever impossible. */
export function norm(w: number[], eps = 1e-3): number[] {
  const s = w.reduce((a, b) => a + b, 0)
  const K = w.length
  return s > 0 ? w.map((x) => ((1 - eps) * x) / s + eps / K) : w.map(() => 1 / K)
}

/** Temperature: tau > 1 sharpens toward the formula's favourites, tau < 1 flattens toward random. tau = 1 is a no-op. */
export function temper(p: number[], tau: number): number[] {
  if (tau === 1) return p
  const w = p.map((x) => x ** tau)
  const s = w.reduce((a, b) => a + b, 0)
  return w.map((x) => x / s)
}

export function digits(v: number, nd: number): number[] {
  const out: number[] = []
  for (let p = nd - 1; p >= 0; p--) out.push(Math.floor(v / 10 ** p) % 10)
  return out
}

export const numDigits = (K: number) => Math.round(Math.log10(K))

/** Combine per-position digit distributions into a K-vector (digits independent). */
export function perDigit(K: number, digitProbs: number[][]): number[] {
  const nd = numDigits(K)
  const w = new Array<number>(K)
  for (let v = 0; v < K; v++) {
    let p = 1
    const ds = digits(v, nd)
    for (let i = 0; i < nd; i++) p *= digitProbs[i][ds[i]]
    w[v] = p
  }
  return norm(w)
}

export function counts(h: number[][], K: number): number[] {
  const c = new Array<number>(K).fill(0)
  for (const draw of h) for (const v of draw) c[v]++
  return c
}

/** Draws since each value last appeared (never seen -> h.length). */
export function gaps(h: number[][], K: number): number[] {
  const last = new Array<number>(K).fill(-1)
  h.forEach((draw, i) => draw.forEach((v) => (last[v] = i)))
  return last.map((l) => (l >= 0 ? h.length - 1 - l : h.length))
}
