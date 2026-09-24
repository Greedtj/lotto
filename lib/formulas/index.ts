import { bayesDigit } from './bayes-digit'
import { cold } from './cold'
import { ewma, EWMA_ALPHA } from './ewma'
import { hot } from './hot'
import { markov } from './markov'
import { MA_WINDOW, movingAvg } from './moving-avg'
import { poissonGap } from './poisson-gap'
import { random } from './random'
import type { Formula } from './util'

export type { Formula } from './util'

export const FORMULAS = {
  random: { name: 'Random', desc: 'สุ่มล้วน ทุกเลขโอกาสเท่ากัน', f: random },
  hot: { name: 'Hot numbers', desc: 'เลขที่ออกบ่อยสุดตลอดประวัติ', f: hot },
  cold: { name: 'Cold / Overdue', desc: 'เลขที่ไม่ออกนานสุด', f: cold },
  moving_avg: { name: 'Moving Average', desc: `ความถี่เฉพาะ ${MA_WINDOW} งวดล่าสุด`, f: movingAvg },
  markov: { name: 'Markov Chain', desc: 'งวดก่อนออกเลขนี้ งวดถัดไปมักออกอะไร', f: markov },
  ewma: { name: 'Exponential Smoothing', desc: `ความถี่ที่ให้น้ำหนักงวดใหม่มากกว่า (α=${EWMA_ALPHA})`, f: ewma },
  bayes_digit: { name: 'Bayesian', desc: 'ประมาณโอกาสแต่ละหลักแยกกัน แล้วรวมเป็นเลข', f: bayesDigit },
  poisson_gap: { name: 'Poisson gap', desc: 'อัตราการออก + ระยะห่าง คำนวณโอกาสถึงรอบ', f: poissonGap },
} satisfies Record<string, { name: string; desc: string; f: Formula }>

export type FormulaId = keyof typeof FORMULAS
export const FORMULA_IDS = Object.keys(FORMULAS) as FormulaId[]
export const isFormulaId = (s: string): s is FormulaId => s in FORMULAS
