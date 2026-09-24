'use client'
import { useActionState, useState } from 'react'
import { authAction, type AuthState } from '@/app/actions/auth'
import { NameInput } from '@/components/NameInput'

export function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [state, action, pending] = useActionState<AuthState, FormData>(authAction, {})
  return (
    <form action={action} noValidate>
      <div className="tabs" role="tablist" aria-label="เลือกโหมด">
        {(['signin', 'signup'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className="tab" aria-current={mode === m ? 'page' : undefined} onClick={() => setMode(m)}>
            {m === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครใหม่'}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={mode} />
      <div className="field">
        <label className="label" htmlFor="name">ชื่อผู้ใช้ (แสดงในอันดับ · ไม่มีเว้นวรรค)</label>
        <NameInput id="name" name="name" autoComplete="username" required minLength={2} defaultValue={state.name} aria-invalid={Boolean(state.error)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="pin">PIN 4 หลัก</label>
        <input className="input" id="pin" name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required aria-invalid={Boolean(state.error)} aria-describedby={state.error ? 'auth-error' : undefined} />
      </div>
      {state.error && <p className="error" id="auth-error" role="alert">{state.error}</p>}
      <button className="btn btn--primary btn--block" disabled={pending} data-loading={pending}>
        {pending ? 'กำลังตรวจสอบ…' : mode === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครและเข้าเล่น'}
      </button>
      {mode === 'signin' && <p className="meta" style={{ marginTop: 'var(--space-md)' }}>ลืม PIN? ติดต่อ admin ให้รีเซ็ตให้</p>}
    </form>
  )
}
