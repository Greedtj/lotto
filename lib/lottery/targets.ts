// Prize categories and how to read them out of a draw result.

export type DrawResult = {
  date: string // YYYY-MM-DD (Gregorian)
  first: string // 6 digits (7 digits for 1990–1994)
  front3: string[] // empty before 2015
  back3: string[] // 4 values before 2015, 2 after
  last2: string
  second?: string[]
  third?: string[]
  fourth?: string[]
  fifth?: string[]
  near1?: string[]
}

/** The 6 categories a user's set contains; each scores 1 point when hit. */
export const CATEGORIES = ['first', 'top3', 'top2', 'front3', 'back3', 'last2'] as const
export type Category = (typeof CATEGORIES)[number]
export type NumberSet = Record<Category, string>

export const CATEGORY_LABEL: Record<Category, string> = {
  first: 'รางวัลที่ 1',
  top3: '3 ตัวบน',
  top2: '2 ตัวบน',
  front3: '3 ตัวหน้า',
  back3: '3 ตัวท้าย',
  last2: '2 ตัวล่าง',
}

/** Series the formulas learn from. first prize is modelled digit by digit. */
export const TARGETS = {
  top3: { K: 1000, values: (d: DrawResult) => [d.first.slice(-3)] },
  top2: { K: 100, values: (d: DrawResult) => [d.first.slice(-2)] },
  front3: { K: 1000, values: (d: DrawResult) => d.front3 },
  back3: { K: 1000, values: (d: DrawResult) => d.back3 },
  last2: { K: 100, values: (d: DrawResult) => [d.last2] },
  ...Object.fromEntries(
    [0, 1, 2, 3, 4, 5].map((i) => [`first_d${i + 1}`, { K: 10, values: (d: DrawResult) => [d.first.slice(-6)[i]] }]),
  ),
} as Record<string, { K: number; values: (d: DrawResult) => string[] }>
export type Target = keyof typeof TARGETS

/** Per-draw value lists for a target, oldest first. Draws without data (front3 before 2015) are skipped. */
export function series(draws: DrawResult[], target: Target): { history: number[][]; K: number } {
  const t = TARGETS[target]
  return { K: t.K, history: draws.map((d) => t.values(d).map(Number)).filter((v) => v.length > 0) }
}
