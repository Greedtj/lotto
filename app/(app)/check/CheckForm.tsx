'use client'
import { useState, useTransition } from 'react'
import { checkTicketAction } from '@/app/actions/read'
import { thaiDate } from '@/lib/format'
import type { CheckResult } from '@/lib/lottery/check'
import type { DrawResult } from '@/lib/lottery/targets'

type Out = { result?: DrawResult; check?: CheckResult; error?: string }

export function CheckForm({ dates }: { dates: string[] }) {
  const [date, setDate] = useState(dates[0])
  const [ticket, setTicket] = useState('')
  const [out, setOut] = useState<Out | null>(null)
  const [pending, start] = useTransition()

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => setOut(await checkTicketAction(date, ticket)))
        }}
      >
        <div className="field">
          <label className="label" htmlFor="draw">งวด</label>
          <select id="draw" className="select" value={date} onChange={(e) => (setDate(e.target.value), setOut(null))}>
            {dates.map((d) => (
              <option key={d} value={d}>{thaiDate(d)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="ticket">เลขสลาก</label>
          <input id="ticket" className="input" inputMode="numeric" autoComplete="off" maxLength={7} placeholder="เช่น 730640" value={ticket} onChange={(e) => setTicket(e.target.value.replace(/\D/g, ''))} aria-invalid={Boolean(out?.error)} aria-describedby={out?.error ? 'check-error' : undefined} />
        </div>
        <button className="btn btn--primary btn--block" disabled={pending || ticket.length < 6} data-loading={pending}>
          {pending ? 'กำลังตรวจ…' : 'ตรวจ'}
        </button>
      </form>

      <div aria-live="polite">
        {out?.error && <p className="error" id="check-error" role="alert" style={{ marginTop: 'var(--space-md)' }}>{out.error}</p>}
        {out?.check && out.result && (
          <section className="card" style={{ marginTop: 'var(--space-lg)' }}>
            {out.check.prizes.length ? (
              <>
                <h2 className="card__name accent">ถูกรางวัล!</h2>
                <ul className="list">
                  {out.check.prizes.map((p) => (
                    <li key={p.key} className="row">
                      <span>{p.label}</span>
                      <b>{p.reward.toLocaleString('th-TH')} บาท</b>
                    </li>
                  ))}
                </ul>
              </>
            ) : out.check.fullCoverage ? (
              <h2 className="card__name">ไม่ถูกรางวัล</h2>
            ) : (
              <>
                <h2 className="card__name">ไม่ถูกรางวัลหลัก</h2>
                <p className="meta">งวดนี้มีข้อมูลเฉพาะรางวัลที่ 1, เลขหน้า/ท้าย 3 ตัว และเลขท้าย 2 ตัว ตรวจรางวัลที่ 2–5 ไม่ได้</p>
              </>
            )}
            <p className="meta" style={{ marginBottom: 0 }}>ผลงวด {thaiDate(out.result.date)} · รางวัลที่ 1 {out.result.first}</p>
          </section>
        )}
      </div>
    </>
  )
}
