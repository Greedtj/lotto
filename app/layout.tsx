import type { Metadata, Viewport } from 'next'
import { Anuphan, Big_Shoulders, Fraunces, Kanit, Noto_Serif_Thai, Spline_Sans_Mono } from 'next/font/google'
import './globals.css'

// Latin faces first; Thai glyphs fall through to the Thai partner in each stack (see design.md).
const bigShoulders = Big_Shoulders({ subsets: ['latin'], weight: ['700', '800'], variable: '--f-big-shoulders', adjustFontFallback: false })
const kanit = Kanit({ subsets: ['thai'], weight: ['600', '700'], variable: '--f-kanit' })
const fraunces = Fraunces({ subsets: ['latin'], weight: ['400', '600'], variable: '--f-fraunces' })
const notoSerifThai = Noto_Serif_Thai({ subsets: ['thai'], weight: ['400', '600'], variable: '--f-noto-serif-thai' })
const splineMono = Spline_Sans_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--f-spline-mono' })
const anuphan = Anuphan({ subsets: ['thai'], weight: ['400', '600'], variable: '--f-anuphan' })

export const metadata: Metadata = {
  title: { default: 'Lotto Lab', template: '%s · Lotto Lab' },
  description: 'สุ่มเลขจากสูตรสถิติ เลือก 1 ชุดต่องวด แข่งกันว่าใครแม่นที่สุด',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5efe3' },
    { media: '(prefers-color-scheme: dark)', color: '#1f1b17' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fonts = [bigShoulders, kanit, fraunces, notoSerifThai, splineMono, anuphan].map((f) => f.variable).join(' ')
  return (
    <html lang="th" className={fonts}>
      <body>{children}</body>
    </html>
  )
}
