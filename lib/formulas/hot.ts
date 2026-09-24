import { counts, norm, type Formula } from './util'

/** Values drawn most often over all history. `prior` = pseudo-count added to every value. */
export const hot: Formula = (h, K, { prior }) => norm(counts(h, K).map((c) => c + prior))
