import { describe, expect, it } from 'vitest'
import draws from '@/research/draws.json'
import parity from './fixtures/parity.json'
import { FORMULAS, FORMULA_IDS } from '@/lib/formulas'
import { series, TARGETS, type DrawResult } from '@/lib/lottery/targets'

const all = draws as DrawResult[]

describe('formulas', () => {
  it('match the Python prototype on single-value targets', () => {
    const sub = all.slice(0, parity.n_draws)
    for (const id of FORMULA_IDS) {
      for (const [t, want] of Object.entries((parity.dists as Record<string, Record<string, number[]>>)[id])) {
        const { history, K } = series(sub, t)
        const got = FORMULAS[id].f(history, K)
        got.forEach((x, i) => expect(x, `${id}/${t}[${i}]`).toBeCloseTo(want[i], 10))
      }
    }
  })

  it('return a valid distribution for every target, including multi-value ones', () => {
    for (const id of FORMULA_IDS) {
      for (const t of Object.keys(TARGETS)) {
        const { history, K } = series(all, t)
        const p = FORMULAS[id].f(history, K)
        expect(p.length).toBe(K)
        expect(Math.min(...p)).toBeGreaterThan(0)
        expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
      }
    }
  })

  it('skip draws without front3 and keep all back3 values', () => {
    const f = series(all, 'front3')
    expect(f.history.every((d) => d.length === 2)).toBe(true)
    expect(f.history.length).toBeLessThan(all.length)
    const b = series(all, 'back3')
    expect(b.history[0].length).toBe(4)
    expect(b.history.at(-1)!.length).toBe(2)
  })

  it('markov with several values per draw averages the rows of the last draw', () => {
    // 1-digit K=10: last draw {1,2}; transitions seen 1->3 and 2->3
    const p = FORMULAS.markov.f([[1, 2], [3], [1, 2]], 10)
    expect(p.indexOf(Math.max(...p))).toBe(3)
  })
})
