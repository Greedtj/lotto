'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const TABS = [
  { href: '/', label: 'สุ่ม', d: 'M4 4h16v16H4zM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01' },
  { href: '/check', label: 'ตรวจหวย', d: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 12l3 3 5-6' },
  { href: '/history', label: 'ประวัติ', d: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2' },
  { href: '/rank', label: 'อันดับ', d: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3' },
] as const

/** N5 floating pill at the bottom. Avatar (profile tab) is passed in so this stays a static shell. */
export function BottomNav({ avatar }: { avatar: React.ReactNode }) {
  const path = usePathname()
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href))
  return (
    <nav className="nav" aria-label="เมนูหลัก">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="nav__item" aria-label={t.label} aria-current={active(t.href) ? 'page' : undefined}>
          <Icon d={t.d} />
        </Link>
      ))}
      <Link href="/me" className="nav__item" aria-label="โปรไฟล์" aria-current={active('/me') ? 'page' : undefined}>
        {avatar}
      </Link>
    </nav>
  )
}
