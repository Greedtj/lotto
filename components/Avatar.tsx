/** First letter for the avatar; skips Thai leading vowels (เ แ โ ใ ไ) so "เอก" shows "อ". */
export function initials(name: string) {
  const s = name.trim().replace(/^[เแโใไ]/, '')
  const first = new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s)[Symbol.iterator]().next().value
  return (first?.segment ?? '?').toUpperCase()
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <span className={large ? 'avatar avatar--lg' : 'avatar'} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
