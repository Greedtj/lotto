// Turn formula distributions into one random number set (sampled by each formula's weights).
import { distribution, FORMULA_IDS, type FormulaId } from '@/lib/formulas'
import { series, type DrawResult, type NumberSet, type Target } from './targets'

/** Cumulative distributions for every formula x target. Same for every user within a draw -> cache it. */
export type CdfTable = Record<FormulaId, Record<Target, number[]>>

export function toCdf(p: number[]): number[] {
  let acc = 0
  return p.map((x) => (acc += x))
}

/**
 * Targets a set is sampled from. 3 ตัวบน / 2 ตัวบน are the tail of the sampled first prize (like a real ticket),
 * so their own top3/top2 models are only used by the admin backtest.
 */
export const SET_TARGETS: Target[] = ['first_d1', 'first_d2', 'first_d3', 'first_d4', 'first_d5', 'first_d6', 'front3', 'back3', 'last2']

export function buildCdfs(draws: DrawResult[], id: FormulaId): Record<Target, number[]> {
  const out = {} as Record<Target, number[]>
  for (const t of SET_TARGETS) {
    const { history, K } = series(draws, t)
    out[t] = toCdf(distribution(id, history, K))
  }
  return out
}

export function buildCdfTable(draws: DrawResult[]): CdfTable {
  return Object.fromEntries(FORMULA_IDS.map((id) => [id, buildCdfs(draws, id)])) as CdfTable
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
  const first = [1, 2, 3, 4, 5, 6].map((i) => pick(`first_d${i}`, 1)).join('')
  return {
    first,
    top3: first.slice(-3),
    top2: first.slice(-2),
    front3: pick('front3', 3),
    back3: pick('back3', 3),
    last2: pick('last2', 2),
  }
}
