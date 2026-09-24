'use client'
import { useActionState } from 'react'
import { renameAction, type RenameState } from '@/app/actions/auth'
import { NameInput } from '@/components/NameInput'

export function RenameForm({ admin, nextAt }: { admin: boolean; nextAt: string | null }) {
  const [state, action, pending] = useActionState<RenameState, FormData>(renameAction, {})
  if (admin) return <p className="meta">บัญชี admin เปลี่ยนชื่อไม่ได้ (สิทธิ์ admin ผูกกับชื่อ)</p>
  if (nextAt && !state.message)
    return <p className="meta">เปลี่ยนชื่อได้อีกครั้ง {new Date(nextAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' })} น.</p>
  return (
    <form action={action} noValidate>
      <div className="field">
        <label className="label" htmlFor="new-name">ชื่อใหม่ (ใช้ login ด้วย · ไม่มีเว้นวรรค)</label>
        <NameInput id="new-name" name="name" required minLength={2} aria-invalid={Boolean(state.error)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="rename-pin">PIN ยืนยัน</label>
        <input className="input" id="rename-pin" name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="current-password" required aria-invalid={Boolean(state.error)} aria-describedby={state.error ? 'rename-error' : undefined} />
      </div>
      {state.error && <p className="error" id="rename-error" role="alert">{state.error}</p>}
      {state.message && <p className="ok" role="status">{state.message}</p>}
      <button className="btn btn--block" disabled={pending} data-loading={pending}>{pending ? 'กำลังเปลี่ยน…' : 'เปลี่ยนชื่อ'}</button>
      <p className="meta" style={{ marginTop: 'var(--space-xs)' }}>เปลี่ยนได้ทุก 15 วัน · แต้มและประวัติยังอยู่ครบ</p>
    </form>
  )
}
