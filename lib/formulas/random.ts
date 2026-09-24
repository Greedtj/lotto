import type { Formula } from './util'

/** Baseline: every value equally likely. */
export const random: Formula = (_h, K) => new Array<number>(K).fill(1 / K)
