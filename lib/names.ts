// Username rules, shared by sign-up, login and rename (pure, testable).

export const RENAME_EVERY_DAYS = 15

/** NFC + drop every whitespace / zero-width character: usernames never contain spaces. */
export const normalizeName = (s: string) => s.normalize('NFC').replace(/[\s​-‍⁠﻿]/g, '')

export function validate(name: string, pin: string): string | null {
  const len = [...name].length
  if (len < 2 || len > 20) return 'ชื่อต้องยาว 2–20 ตัวอักษร (ไม่มีเว้นวรรค)'
  if (!/^\d{4}$/.test(pin)) return 'PIN ต้องเป็นตัวเลข 4 หลัก'
  return null
}

/** When the player may rename again (null = now). */
export function nextRenameAt(renamedAt: string | null, now = new Date()): Date | null {
  if (!renamedAt) return null
  const next = new Date(new Date(renamedAt).getTime() + RENAME_EVERY_DAYS * 86_400_000)
  return next > now ? next : null
}
