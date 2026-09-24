import { CATEGORIES, type Category, type DrawResult, type NumberSet } from './targets'

export type Hits = Record<Category, boolean>

/** 1 point per category hit; 3-digit front/back hit if they match any drawn value. */
export function scoreSet(set: NumberSet, r: DrawResult): Hits {
  return {
    first: set.first === r.first,
    top3: set.top3 === r.first.slice(-3),
    top2: set.top2 === r.first.slice(-2),
    front3: r.front3.includes(set.front3),
    back3: r.back3.includes(set.back3),
    last2: set.last2 === r.last2,
  }
}

export const points = (h: Hits) => CATEGORIES.filter((c) => h[c]).length
