// Tune every formula with a 3-way time split and write lib/formulas/tuning.json (report shown on the admin page).
// Production params live in lib/formulas/tuned.json and are changed by hand only (decision 2026-09-24: keep defaults).
// Run: npm run tune
//
// Protocol (fixed before looking at any result):
//   train  draws before 2016 — grid search, pick the best params
//   val    2016–2020         — best must beat the defaults here, else keep defaults
//   test   2021 onward       — looked at once; `passesRule` = best also beats defaults here
// Score = mean over the 6 categories of mean log(P(sampled pick hits) / P(random pick hits)).
// 0 = exactly random, > 0 = better than random.
import { writeFileSync } from 'node:fs'
import draws from '../research/draws.json'
import { distribution, FORMULAS, FORMULA_IDS, type FormulaId, type Params } from '../lib/formulas'
import { temper } from '../lib/formulas/util'
import { WARMUP } from '../lib/lottery/backtest'
import { CATEGORIES, TARGETS, type Category, type DrawResult } from '../lib/lottery/targets'

const ALL = draws as DrawResult[]
const MIN_HISTORY = 30 // front3 only exists from 2015; need some history before scoring it
const PERIODS = { train: ['0000', '2016-01-01'], val: ['2016-01-01', '2021-01-01'], test: ['2021-01-01', '9999'] } as const
type Period = keyof typeof PERIODS
const periodOf = (date: string) => (Object.keys(PERIODS) as Period[]).find((p) => date >= PERIODS[p][0] && date < PERIODS[p][1])!

type Scores = Record<Period, { score: number; ratio: Partial<Record<Category, number>> }>

/** Cartesian product of a grid. */
function combos(grid: Record<string, number[]>): Params[] {
  return Object.entries(grid).reduce<Params[]>((acc, [k, vs]) => acc.flatMap((c) => vs.map((v) => ({ ...c, [k]: v }))), [{}])
}

type StepLog = { date: string; cat: Category; gain: number; pHit: number; chance: number }

/** Walk forward once for a base param set; evaluate every tau on the same distributions. */
function walk(id: FormulaId, base: Params, taus: number[]): Map<number, StepLog[]> {
  const out = new Map(taus.map((t) => [t, [] as StepLog[]]))
  const log = (tau: number, s: StepLog) => out.get(tau)!.push(s)

  // single-number categories (top3, top2, front3, back3, last2)
  for (const cat of ['top3', 'top2', 'front3', 'back3', 'last2'] as const) {
    const t = TARGETS[cat]
    const rows = ALL.map((d) => ({ date: d.date, v: t.values(d).map(Number) })).filter((r) => r.v.length > 0)
    const history = rows.map((r) => r.v)
    for (let i = 0; i < rows.length; i++) {
      if (ALL.findIndex((d) => d.date === rows[i].date) < WARMUP || i < MIN_HISTORY) continue
      const p = distribution(id, history.slice(0, i), t.K, { ...base, tau: 1 })
      const actual = [...new Set(rows[i].v)]
      const chance = actual.length / t.K
      for (const tau of taus) {
        const q = temper(p, tau)
        const pHit = actual.reduce((s, v) => s + q[v], 0)
        log(tau, { date: rows[i].date, cat, gain: Math.log(pHit / chance), pHit, chance })
      }
    }
  }

  // first prize: 6 independent digit distributions, P(hit) = product
  const digitHist = [0, 1, 2, 3, 4, 5].map((d) => ALL.map((r) => [Number(r.first.slice(-6)[d])]))
  for (let i = WARMUP; i < ALL.length; i++) {
    const ps = digitHist.map((h) => distribution(id, h.slice(0, i), 10, { ...base, tau: 1 }))
    for (const tau of taus) {
      let gain = 0
      let pHit = 1
      ps.forEach((p, d) => {
        const q = temper(p, tau)[digitHist[d][i][0]]
        gain += Math.log(q * 10)
        pHit *= q
      })
      log(tau, { date: ALL[i].date, cat: 'first', gain, pHit, chance: 1e-6 })
    }
  }
  return out
}

function score(steps: StepLog[]): Scores {
  const out = {} as Scores
  for (const period of Object.keys(PERIODS) as Period[]) {
    const inP = steps.filter((s) => periodOf(s.date) === period)
    const ratio: Partial<Record<Category, number>> = {}
    const means: number[] = []
    for (const cat of CATEGORIES) {
      const xs = inP.filter((s) => s.cat === cat)
      if (!xs.length) continue
      means.push(xs.reduce((a, s) => a + s.gain, 0) / xs.length)
      ratio[cat] = xs.reduce((a, s) => a + s.pHit, 0) / xs.reduce((a, s) => a + s.chance, 0)
    }
    out[period] = { score: means.reduce((a, b) => a + b, 0) / means.length, ratio }
  }
  return out
}

/** Paired z-score on test draws: mean per-draw gain difference a - b. */
function pairedZ(a: StepLog[], b: StepLog[]): number {
  const perDraw = (xs: StepLog[]) => {
    const m = new Map<string, number>()
    for (const s of xs) if (periodOf(s.date) === 'test') m.set(s.date, (m.get(s.date) ?? 0) + s.gain)
    return m
  }
  const A = perDraw(a)
  const B = perDraw(b)
  const d = [...A.keys()].map((k) => A.get(k)! - (B.get(k) ?? 0))
  const mean = d.reduce((x, y) => x + y, 0) / d.length
  const sd = Math.sqrt(d.reduce((x, y) => x + (y - mean) ** 2, 0) / (d.length - 1))
  return sd > 0 ? mean / (sd / Math.sqrt(d.length)) : 0
}

const round = (x: number, n = 4) => Number(x.toFixed(n))
const roundScores = (s: Scores) =>
  Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { score: round(v.score, 5), ratio: Object.fromEntries(Object.entries(v.ratio).map(([c, r]) => [c, round(r!, 3)])) }]))

const t0 = Date.now()
const report: Record<string, unknown> = {}

for (const id of FORMULA_IDS) {
  const { grid, defaults } = FORMULAS[id] as { grid: Record<string, number[]>; defaults: Params }
  const { tau: taus, ...baseGrid } = grid
  let best: { params: Params; steps: StepLog[]; scores: Scores } | null = null
  let dflt: { params: Params; steps: StepLog[]; scores: Scores } | null = null
  const tried: { params: Params; train: number }[] = []

  const bases = combos(baseGrid)
  // make sure the defaults are evaluated even if not on the grid
  const { tau: dTau, ...dBase } = defaults
  if (!bases.some((b) => Object.entries(dBase).every(([k, v]) => b[k] === v))) bases.push(dBase)
  const allTaus = [...new Set([...taus, dTau])]

  for (const base of bases) {
    for (const [tau, steps] of walk(id, base, allTaus)) {
      const params = { ...base, tau }
      const scores = score(steps)
      tried.push({ params, train: round(scores.train.score, 5) })
      const isDefault = Object.entries(defaults).every(([k, v]) => (params as Params)[k] === v)
      if (isDefault) dflt = { params, steps, scores }
      if (!best || scores.train.score > best.scores.train.score) best = { params, steps, scores }
    }
  }

  const beatsVal = best!.scores.val.score > dflt!.scores.val.score
  const beatsTest = best!.scores.test.score > dflt!.scores.test.score
  const passesRule = beatsVal && beatsTest && JSON.stringify(best!.params) !== JSON.stringify(dflt!.params)

  report[id] = {
    defaults: dflt!.params,
    best: best!.params,
    passesRule,
    reason: passesRule ? 'ชนะค่าเดิมทั้งช่วงเลือกและช่วงทดสอบ' : !beatsVal ? 'แพ้ค่าเดิมในช่วงเลือก (จูนแล้วจำ noise)' : !beatsTest ? 'ชนะช่วงเลือก แต่แพ้ค่าเดิมในช่วงทดสอบ' : 'ค่าเดิมดีที่สุดอยู่แล้ว',
    default: roundScores(dflt!.scores),
    tuned: roundScores(best!.scores),
    // test-period significance: tuned vs random (gain > 0) and tuned vs defaults
    testZvsRandom: round(pairedZ(best!.steps, []), 2),
    testZvsDefault: round(pairedZ(best!.steps, dflt!.steps), 2),
    tried: tried.length,
  }
  console.log(
    `${id.padEnd(12)} tried ${String(tried.length).padStart(3)}  best ${JSON.stringify(best!.params)}  ` +
      `train ${best!.scores.train.score.toFixed(4)} (dflt ${dflt!.scores.train.score.toFixed(4)})  ` +
      `val ${best!.scores.val.score.toFixed(4)} (dflt ${dflt!.scores.val.score.toFixed(4)})  ` +
      `test ${best!.scores.test.score.toFixed(4)} (dflt ${dflt!.scores.test.score.toFixed(4)})  -> ${passesRule ? 'passes rule' : 'keep defaults'}`,
  )
}

writeFileSync(new URL('../lib/formulas/tuning.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), periods: PERIODS, draws: ALL.length, formulas: report }, null, 1) + '\n')
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s · report: lib/formulas/tuning.json (production params unchanged)`)
