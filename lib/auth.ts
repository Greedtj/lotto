import 'server-only'
import bcrypt from 'bcryptjs'
import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { nextRenameAt, normalizeName, validate } from '@/lib/names'

// Simple identity, not real security: username + 4-digit PIN (per the brief).
const COOKIE = 'lotto_session'
const MAX_AGE = 30 * 24 * 3600
const MAX_FAILS = 5
const LOCK_MINUTES = 15
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET)

export type Player = { id: number; name: string; admin: boolean }

const adminNames = () =>
  (process.env.ADMIN_USERNAMES ?? '').split(',').map((s) => normalizeName(s).toLowerCase()).filter(Boolean)
export const isAdminName = (name: string) => adminNames().includes(normalizeName(name).toLowerCase())


export async function getPlayer(): Promise<Player | null> {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key())
    const name = String(payload.name)
    return { id: Number(payload.sub), name, admin: isAdminName(name) }
  } catch {
    return null
  }
}

export async function requirePlayer(): Promise<Player> {
  const p = await getPlayer()
  if (!p) redirect('/login')
  return p
}

/** Admin = the account's *current* DB name is in ADMIN_USERNAMES (not just the name in the cookie). */
export async function requireAdmin(): Promise<Player> {
  const p = await requirePlayer()
  const { data } = await db.from('players').select('username').eq('id', p.id).maybeSingle()
  if (!data || !isAdminName(data.username)) redirect('/')
  return { ...p, name: data.username, admin: true }
}

async function startSession(id: number, name: string) {
  const token = await new SignJWT({ name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key())
  ;(await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: MAX_AGE })
}

export async function endSession() {
  ;(await cookies()).delete(COOKIE)
}

type PinRow = { id: number; username: string; pin_hash: string; failed_attempts: number; locked_until: string | null }
const PIN_COLUMNS = 'id,username,pin_hash,failed_attempts,locked_until'

/** PIN check with lockout (5 wrong -> 15 min). Returns an error message or null. */
async function verifyPin(p: PinRow, pin: string, wrongMsg: string): Promise<string | null> {
  if (p.locked_until && new Date(p.locked_until) > new Date()) return `ใส่ PIN ผิดหลายครั้ง ลองใหม่หลัง ${new Date(p.locked_until).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })} น.`
  if (!(await bcrypt.compare(pin, p.pin_hash))) {
    const fails = p.failed_attempts + 1
    await db.from('players').update({
      failed_attempts: fails >= MAX_FAILS ? 0 : fails,
      locked_until: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
    }).eq('id', p.id)
    return wrongMsg
  }
  if (p.failed_attempts || p.locked_until) await db.from('players').update({ failed_attempts: 0, locked_until: null }).eq('id', p.id)
  return null
}

/** Returns an error message, or null on success (session started). */
export async function signIn(rawName: string, pin: string): Promise<string | null> {
  const name = normalizeName(rawName)
  const bad = validate(name, pin)
  if (bad) return bad
  const { data: p } = await db.from('players').select(PIN_COLUMNS).ilike('username', escapeLike(name)).maybeSingle()
  if (!p) return 'ชื่อหรือ PIN ไม่ถูกต้อง'
  const err = await verifyPin(p, pin, 'ชื่อหรือ PIN ไม่ถูกต้อง')
  if (err) return err
  await startSession(p.id, p.username)
  return null
}

/** Rename = new login name too. PIN required, once every 15 days, admins can't (admin is by name). */
export async function rename(playerId: number, rawName: string, pin: string): Promise<{ error?: string; name?: string }> {
  const name = normalizeName(rawName)
  const bad = validate(name, pin)
  if (bad) return { error: bad }
  const { data: p } = await db.from('players').select(`${PIN_COLUMNS},renamed_at`).eq('id', playerId).maybeSingle()
  if (!p) return { error: 'ไม่พบบัญชี' }
  if (isAdminName(p.username)) return { error: 'บัญชี admin เปลี่ยนชื่อไม่ได้' }
  if (name === p.username) return { error: 'ชื่อใหม่ต้องไม่ซ้ำชื่อเดิม' }
  if (isAdminName(name)) return { error: 'ชื่อนี้ถูกจองไว้แล้ว' }
  const wait = nextRenameAt(p.renamed_at)
  if (wait) return { error: `เปลี่ยนชื่อได้อีกครั้ง ${wait.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })} น.` }
  const err = await verifyPin(p, pin, 'PIN ไม่ถูกต้อง')
  if (err) return { error: err }
  // conditional update: two tabs can't both slip past the 15-day rule
  const since = new Date(Date.now() - 15 * 86_400_000).toISOString()
  const { data, error } = await db
    .from('players')
    .update({ username: name, renamed_at: new Date().toISOString() })
    .eq('id', playerId)
    .or(`renamed_at.is.null,renamed_at.lt.${since}`)
    .select('id')
  if (error) return { error: error.code === '23505' ? 'ชื่อนี้มีคนใช้แล้ว' : 'เปลี่ยนชื่อไม่สำเร็จ ลองใหม่อีกครั้ง' }
  if (!data?.length) return { error: 'เพิ่งเปลี่ยนชื่อไป รอครบ 15 วันก่อน' }
  await startSession(playerId, name)
  return { name }
}

export async function getRenameInfo(playerId: number) {
  const { data } = await db.from('players').select('username,renamed_at').eq('id', playerId).maybeSingle()
  return { admin: data ? isAdminName(data.username) : false, nextAt: nextRenameAt(data?.renamed_at ?? null)?.toISOString() ?? null }
}

export async function signUp(rawName: string, pin: string): Promise<string | null> {
  const name = normalizeName(rawName)
  const bad = validate(name, pin)
  if (bad) return bad
  if (isAdminName(name)) return 'ชื่อนี้ถูกจองไว้แล้ว'
  const { data, error } = await db.from('players').insert({ username: name, pin_hash: await bcrypt.hash(pin, 10) }).select('id').single()
  if (error) return error.code === '23505' ? 'ชื่อนี้มีคนใช้แล้ว' : 'สมัครไม่สำเร็จ ลองใหม่อีกครั้ง'
  await startSession(data.id, name)
  return null
}

export async function resetPin(playerId: number, pin: string) {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN ต้องเป็นตัวเลข 4 หลัก')
  await db.from('players').update({ pin_hash: await bcrypt.hash(pin, 10), failed_attempts: 0, locked_until: null }).eq('id', playerId)
}

// ilike treats % and _ as wildcards; names are matched literally.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => '\\' + c)
