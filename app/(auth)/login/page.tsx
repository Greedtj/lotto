import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'เข้าสู่ระบบ' }

export default function LoginPage() {
  return (
    <main className="page">
      <div className="masthead">
        <span>Lotto Lab</span>
        <span>สูตรสถิติ × หวยรัฐบาล</span>
      </div>
      <h1 className="riso" style={{ fontSize: 'var(--text-display)', marginBottom: 'var(--space-lg)' }}>
        เลขหรรษา
        <br />
        <span className="accent">แข่งกันแม่น</span>
      </h1>
      <p className="muted">เลือกเลข 1 ชุดต่องวดจากสูตรสถิติ ถูกหมวดไหนได้ 1 แต้ม ใครแต้มเยอะสุดชนะ</p>
      <hr className="rule" />
      <LoginForm />
    </main>
  )
}
