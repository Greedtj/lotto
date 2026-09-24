import { describe, expect, it } from 'vitest'
import { nextRenameAt, normalizeName, validate } from '@/lib/names'

describe('usernames', () => {
  it('strips every kind of space', () => {
    expect(normalizeName('  สม ชาย ')).toBe('สมชาย')
    expect(normalizeName('a\tb\nc d​e')).toBe('abcde')
  })
  it('normalizes Thai to NFC so lookalikes match', () => {
    expect(normalizeName('นํา')).toBe('นํา'.normalize('NFC'))
  })
  it('validates length and PIN', () => {
    expect(validate('a', '1234')).toMatch(/2–20/)
    expect(validate('ab', '12a4')).toMatch(/PIN/)
    expect(validate('สมชาย', '1234')).toBeNull()
  })
  it('allows a rename every 15 days', () => {
    const now = new Date('2026-10-20T00:00:00Z')
    expect(nextRenameAt(null, now)).toBeNull()
    expect(nextRenameAt('2026-10-10T00:00:00Z', now)?.toISOString()).toBe('2026-10-25T00:00:00.000Z')
    expect(nextRenameAt('2026-10-05T00:00:00Z', now)).toBeNull()
  })
})
