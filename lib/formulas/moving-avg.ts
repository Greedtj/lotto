import { counts, norm, type Formula } from './util'

// Fixed up front — never tuned on backtest results.
export const MA_WINDOW = 100

/** Frequency over the last MA_WINDOW draws only. */
export const movingAvg: Formula = (h, K) => norm(counts(h.slice(-MA_WINDOW), K).map((c) => c + 1))
