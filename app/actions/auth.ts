'use server'
import { redirect } from 'next/navigation'
import { endSession, signIn, signUp } from '@/lib/auth'

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
