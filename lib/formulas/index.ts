import { bayesDigit } from './bayes-digit'
import { cold } from './cold'
import { ewma } from './ewma'
import { hot } from './hot'
import { markov } from './markov'
import { movingAvg } from './moving-avg'
import { poissonGap } from './poisson-gap'
import { random } from './random'
import tuned from './tuned.json'
import { temper, type Formula, type Params } from './util'

export type { Formula, Params } from './util'

type Def = { name: string; desc: string; f: Formula; defaults: Params; grid: Record<string, number[]> }

// Every formula also takes `tau` (temperature), applied on top of its distribution.
const TAU = [0.5, 1, 2, 4]

export const FORMULAS = {
  random: { name: 'Random', desc: 'สุ่มล้วน ทุกเลขโอกาสเท่ากัน', f: random, defaults: { tau: 1 }, grid: { tau: [1] } },
  hot: { name: 'Hot numbers', desc: 'เลขที่ออกบ่อยสุดตลอดประวัติ', f: hot, defaults: { prior: 1, tau: 1 }, grid: { prior: [0.1, 0.5, 1, 2, 5, 20], tau: TAU } },
  cold: { name: 'Cold / Overdue', desc: 'เลขที่ไม่ออกนานสุด', f: cold, defaults: { beta: 1, tau: 1 }, grid: { beta: [0.25, 0.5, 1, 1.5, 2, 3], tau: TAU } },
  moving_avg: { name: 'Moving Average', desc: 'ความถี่เฉพาะช่วงงวดล่าสุด', f: movingAvg, defaults: { window: 100, prior: 1, tau: 1 }, grid: { window: [10, 25, 50, 100, 200, 400], prior: [0.5, 2], tau: TAU } },
  markov: { name: 'Markov Chain', desc: 'งวดก่อนออกเลขนี้ งวดถัดไปมักออกอะไร', f: markov, defaults: { prior: 1, tau: 1 }, grid: { prior: [0.1, 0.5, 1, 2, 5, 20], tau: TAU } },
  ewma: { name: 'Exponential Smoothing', desc: 'ความถี่ที่ให้น้ำหนักงวดใหม่มากกว่า', f: ewma, defaults: { alpha: 0.05, tau: 1 }, grid: { alpha: [0.005, 0.01, 0.02, 0.05, 0.1, 0.2], tau: TAU } },
  bayes_digit: { name: 'Bayesian', desc: 'ประมาณโอกาสแต่ละหลักแยกกัน แล้วรวมเป็นเลข', f: bayesDigit, defaults: { prior: 1, decay: 0, tau: 1 }, grid: { prior: [0.5, 1, 5, 20], decay: [0, 0.005, 0.02], tau: TAU } },
  poisson_gap: { name: 'Poisson gap', desc: 'อัตราการออก + ระยะห่าง คำนวณโอกาสถึงรอบ', f: poissonGap, defaults: { prior: 1, tau: 1 }, grid: { prior: [0.1, 0.5, 1, 2, 5, 20], tau: TAU } },
} satisfies Record<string, Def>

export type FormulaId = keyof typeof FORMULAS
export const FORMULA_IDS = Object.keys(FORMULAS) as FormulaId[]
export const isFormulaId = (s: string): s is FormulaId => s in FORMULAS

/** Params in production: tuned values (scripts/tune.ts -> tuned.json) where they won, defaults otherwise. */
export const PARAMS: Record<FormulaId, Params> = Object.fromEntries(
  FORMULA_IDS.map((id) => [id, { ...FORMULAS[id].defaults, ...((tuned as Record<string, Params>)[id] ?? {}) }]),
) as unknown as Record<FormulaId, Params>

/** The distribution a formula gives for the next value, with the given (default: production) params. */
export function distribution(id: FormulaId, history: number[][], K: number, params: Params = PARAMS[id]): number[] {
  const { tau = 1, ...rest } = params
  return temper(FORMULAS[id].f(history, K, rest), tau)
}
