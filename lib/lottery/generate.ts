// Turn formula distributions into one random number set (sampled by each formula's weights).
import { FORMULAS, FORMULA_IDS, type FormulaId } from '@/lib/formulas'
import { series, TARGETS, type DrawResult, type NumberSet, type Target } from './targets'

/** Cumulative distributions for every formula x target. Same for every user within a draw -> cache it. */
export type CdfTable = Record<FormulaId, Record<Target, number[]>>

export function toCdf(p: number[]): number[] {
  let acc = 0
  return p.map((x) => (acc += x))
}

export function buildCdfTable(draws: DrawResult[]): CdfTable {
  const table = {} as CdfTable
  for (const id of FORMULA_IDS) {
    table[id] = {} as Record<Target, number[]>
    for (const t of Object.keys(TARGETS)) {
      const { history, K } = series(draws, t)
      table[id][t] = toCdf(FORMULAS[id].f(history, K))
    }
  }
  return table
}

/** Binary search: first index whose cumulative prob exceeds u*total. */
export function sampleIndex(cdf: number[], u: number): number {
  const x = u * cdf[cdf.length - 1]
  let lo = 0
  let hi = cdf.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cdf[mid] > x) hi = mid
    else lo = mid + 1
  }
  return lo
}

export const cryptoRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

export function generateSet(cdfs: Record<Target, number[]>, rand: () => number = cryptoRandom): NumberSet {
  const pick = (t: Target, width: number) => String(sampleIndex(cdfs[t], rand())).padStart(width, '0')
  return {
    first: [1, 2, 3, 4, 5, 6].map((i) => pick(`first_d${i}`, 1)).join(''),
    top3: pick('top3', 3),
    top2: pick('top2', 2),
    front3: pick('front3', 3),
    back3: pick('back3', 3),
    last2: pick('last2', 2),
  }
}
