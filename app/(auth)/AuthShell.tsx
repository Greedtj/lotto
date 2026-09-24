import { LoginForm, type Mode } from './login/LoginForm'

/** Shared page for /login and /signup: separate static routes, so switching works before (and without) JS. */
export function AuthShell({ mode }: { mode: Mode }) {
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
      <LoginForm mode={mode} />
    </main>
  )
}
