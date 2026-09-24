// Thai date display (Buddhist year), always Bangkok time.
const opts = { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric' } as const

export const thaiDate = (date: string) => new Date(`${date}T12:00:00+07:00`).toLocaleDateString('th-TH', opts)
export const thaiShortDate = (date: string) =>
  new Date(`${date}T12:00:00+07:00`).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: '2-digit' })
