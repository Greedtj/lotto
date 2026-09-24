// Walk-forward backtest (admin only): draw t is predicted from draws before t only.
// Kept as running sums so a new result only adds one step (no full re-run).
import { distribution, FORMULA_IDS, type FormulaId } from '@/lib/formulas'
import { series, TARGETS, type DrawResult, type Target } from './targets'

export const WARMUP = 100 // first draws are history only, never scored

export type Tally = {
  n: number
  hit1: number // top-1 value was drawn
  hit10: number // one of the top-10 values was drawn
  pHit: number // sum of P(a sampled pick hits) — what users actually get
  chance: number // sum of the same probability under pure random
  logloss: number
}
export type BacktestTable = Record<FormulaId, Record<Target, Tally>>

const empty = (): Tally => ({ n: 0, hit1: 0, hit10: 0, pHit: 0, chance: 0, logloss: 0 })

/** Indices of the k largest probabilities, ties broken by `rand` (so Random stays random). */
export function topK(p: number[], k: number, rand: () => number): number[] {
  const best: [number, number, number][] = [] // [prob, tiebreak, index], sorted desc
  for (let i = 0; i < p.length; i++) {
    const item: [number, number, number] = [p[i], rand(), i]
    if (best.length === k && (item[0] < best[k - 1][0] || (item[0] === best[k - 1][0] && item[1] <= best[k - 1][1]))) continue
    let j = best.length
    while (j > 0 && (best[j - 1][0] < item[0] || (best[j - 1][0] === item[0] && best[j - 1][1] < item[1]))) j--
    best.splice(j, 0, item)
    if (best.length > k) best.pop()
  }
  return best.map((b) => b[2])
}

function step(t: Tally, p: number[], actual: number[], K: number, rand: () => number) {
  const top = topK(p, 10, rand)
  const hitP = actual.reduce((s, v) => s + p[v], 0)
  t.n++
  t.hit1 += Number(actual.includes(top[0]))
  t.hit10 += Number(top.some((v) => actual.includes(v)))
  t.pHit += hitP
  t.chance += new Set(actual).size / K
  t.logloss -= Math.log(hitP)
}

/** Full walk-forward over all draws (seed / rebuild). */
export function backtestAll(draws: DrawResult[], rand: () => number = Math.random): BacktestTable {
  const table = {} as BacktestTable
  for (const id of FORMULA_IDS) {
    table[id] = {} as Record<Target, Tally>
    for (const target of Object.keys(TARGETS)) {
      const { history, K } = series(draws, target)
      const tally = empty()
      for (let i = WARMUP; i < history.length; i++) step(tally, distribution(id, history.slice(0, i), K), history[i], K, rand)
      table[id][target] = tally
    }
  }
  return table
}

/** Add one new draw to an existing table. `before` = all draws before `latest`. */
export function backtestAdd(table: BacktestTable, before: DrawResult[], latest: DrawResult, rand: () => number = Math.random) {
  for (const id of FORMULA_IDS) {
    for (const target of Object.keys(TARGETS)) {
      const { history, K } = series(before, target)
      const actual = TARGETS[target].values(latest).map(Number)
      if (!actual.length || history.length < WARMUP) continue
      table[id][target] ??= empty()
      step(table[id][target], distribution(id, history, K), actual, K, rand)
    }
  }
  return table
}

/** One-sided binomial P(X >= x), X ~ Bin(n, p). */
export function binomSf(x: number, n: number, p: number): number {
  if (x <= 0) return 1
  const lg = (k: number) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log1p(-p)
  let s = 0
  for (let k = x; k <= n; k++) s += Math.exp(lg(k))
  return Math.min(1, s)
}

// Lanczos approximation (JS has no Math.lgamma)
function lgamma(z: number): number {
  const g = 7
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z)
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}
