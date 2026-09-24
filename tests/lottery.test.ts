import { describe, expect, it } from 'vitest'
import draws from '@/research/draws.json'
import { checkTicket } from '@/lib/lottery/check'
import { buildCdfTable, generateSet, sampleIndex, toCdf } from '@/lib/lottery/generate'
import { bangkokDate, lockAt, nextDefaultDrawDate, pickWindow } from '@/lib/lottery/schedule'
import { points, scoreSet } from '@/lib/lottery/scoring'
import { backtestAdd, backtestAll, binomSf, topK } from '@/lib/lottery/backtest'
import type { DrawResult } from '@/lib/lottery/targets'

const all = draws as DrawResult[]
const latest: DrawResult = {
  date: '2026-09-16', first: '730640', front3: ['060', '521'], back3: ['041', '266'], last2: '64',
  second: ['047801'], near1: ['730639', '730641'], third: [], fourth: [], fifth: [],
}

describe('schedule', () => {
  it('locks at exactly 14:00 Bangkok', () => {
    const slots = [{ date: '2026-10-01', resulted: false }]
    expect(pickWindow(slots, new Date('2026-10-01T13:59:59+07:00')).state).toBe('open')
    expect(pickWindow(slots, new Date('2026-10-01T14:00:00+07:00')).state).toBe('waiting')
  })
  it('uses the Bangkok date, not UTC', () => {
    expect(bangkokDate(new Date('2026-09-30T18:30:00Z'))).toBe('2026-10-01')
  })
  it('opens the next draw once the locked one has a result', () => {
    const now = new Date('2026-10-01T16:30:00+07:00')
    expect(pickWindow([{ date: '2026-10-01', resulted: false }, { date: '2026-10-16', resulted: false }], now).state).toBe('waiting')
    const w = pickWindow([{ date: '2026-10-01', resulted: true }, { date: '2026-10-16', resulted: false }], now)
    expect(w).toEqual({ state: 'open', draw: '2026-10-16', closesAt: lockAt('2026-10-16') })
    expect(pickWindow([{ date: '2026-10-01', resulted: true }], now).state).toBe('none')
  })
  it('defaults to the 1st and 16th', () => {
    expect(nextDefaultDrawDate('2026-09-16')).toBe('2026-10-01')
    expect(nextDefaultDrawDate('2026-10-01')).toBe('2026-10-16')
    expect(nextDefaultDrawDate('2026-12-30')).toBe('2027-01-01') // special 30 Dec draw -> admin moves to 17 Jan if needed
    expect(nextDefaultDrawDate('2026-05-02')).toBe('2026-05-16')
  })
})

describe('scoring', () => {
  it('scores each category independently', () => {
    const h = scoreSet({ first: '000000', top3: '640', top2: '11', front3: '521', back3: '999', last2: '64' }, latest)
    expect(h).toEqual({ first: false, top3: true, top2: false, front3: true, back3: false, last2: true })
    expect(points(h)).toBe(3)
  })
})

describe('check ticket', () => {
  it('finds every prize a ticket wins', () => {
    expect(checkTicket('730640', latest).prizes.map((p) => p.key)).toEqual(['first'])
    expect(checkTicket('730641', latest).prizes.map((p) => p.key)).toEqual(['near1'])
    expect(checkTicket('521266', latest).prizes.map((p) => p.key)).toEqual(['front3', 'back3'])
    expect(checkTicket('123464', latest).prizes.map((p) => p.key)).toEqual(['last2'])
  })
  it('flags draws that only have main prizes', () => {
    const old = all[0] // 1990, 7-digit first prize, myhora data only
    expect(checkTicket(old.first, old).fullCoverage).toBe(false)
    expect(() => checkTicket('123456', old)).toThrow()
  })
})

describe('generate', () => {
  it('samples by weight via the CDF', () => {
    const cdf = toCdf([0.1, 0.6, 0.3])
    expect([0, 0.09, 0.1, 0.69, 0.7, 0.999].map((u) => sampleIndex(cdf, u))).toEqual([0, 0, 1, 1, 2, 2])
  })
  it('builds a well-formed set for every formula', () => {
    const table = buildCdfTable(all)
    for (const cdfs of Object.values(table)) {
      const s = generateSet(cdfs)
      expect(s.first).toMatch(/^\d{6}$/)
      expect(s.top3).toMatch(/^\d{3}$/)
      expect(s.front3).toMatch(/^\d{3}$/)
      expect(s.last2).toMatch(/^\d{2}$/)
    }
  })
})

describe('backtest', () => {
  it('topK returns the largest values', () => {
    expect(topK([0.1, 0.5, 0.2, 0.9], 2, Math.random)).toEqual([3, 1])
  })
  it('adding one draw equals re-running on all draws (deterministic formulas)', () => {
    const sub = all.slice(0, 130)
    const rand = () => 0.5
    const full = backtestAll(sub, rand)
    const inc = backtestAdd(backtestAll(sub.slice(0, -1), rand), sub.slice(0, -1), sub.at(-1)!, rand)
    expect(inc.hot.last2).toEqual(full.hot.last2)
    expect(inc.markov.top3.n).toBe(full.markov.top3.n)
  })
  it('binomSf matches known values', () => {
    expect(binomSf(0, 10, 0.1)).toBe(1)
    expect(binomSf(10, 10, 0.5)).toBeCloseTo(1 / 1024, 12)
  })
})

import { isComplete } from '@/lib/glo'
import { denseRank, periodRange } from '@/lib/lottery/rank'

describe('glo completeness', () => {
  const full = { ...latest, near1: ['1', '2'], second: Array(5).fill('0'), third: Array(10).fill('0'), fourth: Array(50).fill('0'), fifth: Array(100).fill('0') }
  it('needs every prize list', () => {
    expect(isComplete(full)).toBe(true)
    expect(isComplete({ ...full, fifth: full.fifth.slice(1) })).toBe(false)
    expect(isComplete({ ...full, front3: [], back3: ['1', '2', '3', '4'] })).toBe(true) // pre-2015 shape
  })
})

describe('rank', () => {
  it('shares ranks on ties (dense)', () => {
    const r = denseRank([{ s: 3 }, { s: 5 }, { s: 3 }, { s: 1 }], (x) => x.s).map((x) => x.rank)
    expect(r).toEqual([1, 2, 2, 3])
  })
  it('turns periods into date ranges', () => {
    expect(periodRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(periodRange('2024')).toEqual({ from: '2024-01-01', to: '2024-12-31' })
    expect(periodRange('all').from).toBe('1900-01-01')
  })
})
