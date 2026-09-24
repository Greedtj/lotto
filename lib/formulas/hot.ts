import { counts, norm, type Formula } from './util'

/** Values drawn most often over all history. */
export const hot: Formula = (h, K) => norm(counts(h, K).map((c) => c + 1))
