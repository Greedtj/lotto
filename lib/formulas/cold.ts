import { gaps, norm, type Formula } from './util'

/** Values not drawn for the longest time ("overdue"). */
export const cold: Formula = (h, K) => norm(gaps(h, K).map((g) => g + 1))
