import { gaps, norm, type Formula } from './util'

/** Values not drawn for the longest time ("overdue"). weight = (gap + 1) ^ beta. */
export const cold: Formula = (h, K, { beta }) => norm(gaps(h, K).map((g) => (g + 1) ** beta))
