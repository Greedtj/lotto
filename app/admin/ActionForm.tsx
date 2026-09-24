'use client'
import { useActionState } from 'react'
import type { AdminState } from '@/app/actions/admin'

/** Form wrapper that shows the action's message / error inline. */
export function ActionForm({ action, submit, children }: { action: (s: AdminState, f: FormData) => Promise<AdminState>; submit: string; children: React.ReactNode }) {
  const [state, run, pending] = useActionState(action, {})
  return (
    <form action={run}>
      {children}
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.message && <p className="ok" role="status">{state.message}</p>}
      <button className="btn btn--primary btn--block" disabled={pending} data-loading={pending}>{pending ? 'กำลังทำ…' : submit}</button>
    </form>
  )
}
