'use server'
import { updateTag } from 'next/cache'
import { requireAdmin, resetPin } from '@/lib/auth'
import { TAG } from '@/lib/data'
import { db } from '@/lib/db'
import { fetchGloResult } from '@/lib/glo'
import { ingestResult } from '@/lib/ingest'

export type AdminState = { message?: string; error?: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const refresh = () => Object.values(TAG).forEach(updateTag)
const ok = (message: string): AdminState => (refresh(), { message })

export async function fetchResultAction(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin()
  const date = String(form.get('date'))
  if (!DATE.test(date)) return { error: 'วันที่ไม่ถูกต้อง' }
  const r = await fetchGloResult(date).catch((e) => ({ error: String(e) }))
  if (!r) return { error: `กองสลากยังไม่มีผลงวด ${date}` }
  if ('error' in r) return { error: `เรียก GLO ไม่ได้: ${r.error}` }
  const { scored } = await ingestResult(r, 'glo')
  return ok(`บันทึกผลงวด ${date} แล้ว คิดแต้ม ${scored} ชุด`)
}

export async function saveResultAction(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin()
  const get = (k: string) => String(form.get(k) ?? '').trim()
  const list = (k: string) => get(k).split(/[\s,]+/).filter(Boolean)
  const r = { date: get('date'), first: get('first'), front3: list('front3'), back3: list('back3'), last2: get('last2') }
  if (!DATE.test(r.date) || !/^\d{6}$/.test(r.first) || !/^\d{2}$/.test(r.last2) || [...r.front3, ...r.back3].some((v) => !/^\d{3}$/.test(v)) || r.front3.length !== 2 || r.back3.length !== 2)
    return { error: 'ข้อมูลไม่ครบ: รางวัลที่ 1 (6 หลัก), เลขหน้า 3 ตัว 2 ชุด, เลขท้าย 3 ตัว 2 ชุด, เลขท้าย 2 ตัว' }
  const { scored } = await ingestResult(r, 'admin')
  return ok(`บันทึกผลงวด ${r.date} แล้ว คิดแต้ม ${scored} ชุด`)
}

export async function scheduleAction(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin()
  const op = String(form.get('op'))
  const date = String(form.get('date'))
  const to = String(form.get('to') ?? '')
  if (!DATE.test(date) || (op === 'move' && !DATE.test(to))) return { error: 'วันที่ไม่ถูกต้อง' }
  const q =
    op === 'add' ? db.from('draws').insert({ draw_date: date, status: 'scheduled' })
    : op === 'move' ? db.from('draws').update({ draw_date: to }).eq('draw_date', date).eq('status', 'scheduled')
    : db.from('draws').delete().eq('draw_date', date).eq('status', 'scheduled')
  const { error } = await q
  if (error) return { error: error.code === '23505' ? 'มีงวดวันนี้อยู่แล้ว' : error.message }
  return ok(op === 'add' ? `เพิ่มงวด ${date}` : op === 'move' ? `ย้ายงวด ${date} → ${to}` : `ลบงวด ${date}`)
}

export async function resetPinAction(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin()
  const id = Number(form.get('player'))
  const pin = String(form.get('pin'))
  if (!/^\d{4}$/.test(pin)) return { error: 'PIN ต้องเป็นตัวเลข 4 หลัก' }
  await resetPin(id, pin)
  return { message: 'รีเซ็ต PIN แล้ว' }
}

/** Roll policy: 1 or 3 rolls per day, or unlimited (empty). */
export async function rollPolicyAction(_: AdminState, form: FormData): Promise<AdminState> {
  await requireAdmin()
  const v = String(form.get('per_day'))
  const perDay = v === 'unlimited' ? null : Number(v)
  if (perDay !== null && ![1, 3].includes(perDay)) return { error: 'เลือกได้แค่ วันละ 1 / วันละ 3 / ไม่จำกัด' }
  const { error } = await db.from('settings').update({ rolls_per_day: perDay, updated_at: new Date().toISOString() }).eq('id', 1)
  if (error) return { error: error.message }
  return { message: `ตั้งเป็น${perDay === null ? 'สุ่มได้ไม่จำกัด' : `วันละ ${perDay} ครั้ง`}แล้ว มีผลทันที` }
}

/** Give every player their full allowance again, counted from now. */
export async function resetRollsAction(): Promise<AdminState> {
  await requireAdmin()
  const now = new Date().toISOString()
  const { error } = await db.from('settings').update({ rolls_reset_at: now, updated_at: now }).eq('id', 1)
  if (error) return { error: error.message }
  return { message: 'รีเซ็ตสิทธิ์สุ่มของทุกคนแล้ว' }
}
