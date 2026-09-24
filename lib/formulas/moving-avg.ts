import { counts, norm, type Formula } from './util'

/** Frequency over the last `window` draws only. */
export const movingAvg: Formula = (h, K, { window, prior }) => norm(counts(h.slice(-window), K).map((c) => c + prior))
