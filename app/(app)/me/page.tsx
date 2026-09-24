import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { logoutAction } from '@/app/actions/auth'
import { Avatar } from '@/components/Avatar'
import { getRenameInfo, requirePlayer } from '@/lib/auth'
import { getMyTotals } from '@/lib/data'
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/lottery/targets'
import { RenameForm } from './RenameForm'

export const metadata: Metadata = { title: 'โปรไฟล์' }

export default function MePage() {
  return (
    <main className="page">
      <div className="masthead">
        <span>โปรไฟล์</span>
        <span>สถิติที่ทายไว้</span>
      </div>
      <Suspense fallback={<p className="meta">กำลังโหลด…</p>}>
        <Profile />
      </Suspense>
    </main>
  )
}

async function Profile() {
  const me = await requirePlayer()
  const [{ played, totals }, renameInfo] = await Promise.all([getMyTotals(me.id), getRenameInfo(me.id)])
  const sum = CATEGORIES.reduce((s, c) => s + totals[c], 0)
  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-start', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <Avatar name={me.name} large />
        <div style={{ minWidth: 0 }}>
          <h1 className="title" style={{ marginBottom: 0 }}>{me.name}</h1>
          <p className="meta" style={{ margin: 0 }}>ร่วม {played} งวด · {sum} แต้ม</p>
        </div>
      </div>
      <h2 className="label" style={{ marginBottom: 'var(--space-xs)' }}>แต้มแยกหมวด</h2>
      <div className="stats">
        {CATEGORIES.map((c) => (
          <div key={c} className="stat">
            <b>{totals[c]}</b>
            <span className="meta">{CATEGORY_LABEL[c]}</span>
          </div>
        ))}
      </div>
      <hr className="rule" />
      <h2 className="label" style={{ marginBottom: 'var(--space-xs)' }}>เปลี่ยนชื่อ</h2>
      <RenameForm admin={renameInfo.admin} nextAt={renameInfo.nextAt} />
      <hr className="rule" />
      <Link className="btn btn--block" href="/history?tab=mine">ดูเลขที่เคยเลือก</Link>
      {me.admin && (
        <Link className="btn btn--block" href="/admin" style={{ marginTop: 'var(--space-xs)' }}>หน้า admin</Link>
      )}
      <form action={logoutAction} style={{ marginTop: 'var(--space-xs)' }}>
        <button className="btn btn--block">ออกจากระบบ</button>
      </form>
    </>
  )
}
