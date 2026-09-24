'use server'
import { updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { endSession, rename, requirePlayer, signIn, signUp } from '@/lib/auth'
import { TAG } from '@/lib/data'

export type AuthState = { error?: string; name?: string }

export async function authAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get('name') ?? '')
  const pin = String(form.get('pin') ?? '')
  const error = form.get('mode') === 'signup' ? await signUp(name, pin) : await signIn(name, pin)
  if (error) return { error, name }
  redirect('/')
}

export async function logoutAction() {
  await endSession()
  redirect('/login')
}

export type RenameState = { error?: string; message?: string }

export async function renameAction(_prev: RenameState, form: FormData): Promise<RenameState> {
  const me = await requirePlayer()
  const r = await rename(me.id, String(form.get('name') ?? ''), String(form.get('pin') ?? ''))
  if (r.error) return { error: r.error }
  updateTag(TAG.scores) // leaderboard shows names
  return { message: `เปลี่ยนชื่อเป็น ${r.name} แล้ว ครั้งต่อไปให้ login ด้วยชื่อนี้` }
}
