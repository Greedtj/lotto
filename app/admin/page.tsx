import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { fetchResultAction, resetPinAction, saveResultAction, scheduleAction } from '@/app/actions/admin'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { FORMULAS, FORMULA_IDS } from '@/lib/formulas'
import { thaiDate } from '@/lib/format'
import { binomSf, type BacktestTable } from '@/lib/lottery/backtest'
import { ActionForm } from './ActionForm'

export const metadata: Metadata = { title: 'Admin' }

export default function AdminPage() {
  return (
    <main className="page" style={{ paddingBottom: 'var(--space-2xl)' }}>
      <div className="masthead">
        <Link href="/me">← กลับ</Link>
        <span>Admin</span>
      </div>
      <h1 className="title riso">หลังบ้าน</h1>
      <Suspense fallback={<p className="meta">กำลังโหลด…</p>}>
        <Admin />
      </Suspense>
    </main>
  )
}

const TARGET_LABEL: Record<string, string> = { top3: '3 บน', top2: '2 บน', front3: '3 หน้า', back3: '3 ท้าย', last2: '2 ล่าง' }

async function Admin() {
  await requireAdmin()
  const [scheduled, players, bt] = await Promise.all([
    db.from('draws').select('draw_date').eq('status', 'scheduled').order('draw_date'),
    db.from('players').select('id,username,locked_until').order('username'),
    db.from('backtest').select('through_date,tally').eq('id', 1).maybeSingle(),
  ])
  const dates = (scheduled.data ?? []).map((d) => d.draw_date as string)
  const tally = bt.data?.tally as BacktestTable | undefined

  return (
    <>
      <section className="card">
        <h2 className="card__name">งวดที่เปิดอยู่</h2>
        <ul className="list">{dates.map((d) => <li key={d}>{thaiDate(d)} <span className="meta">({d})</span></li>)}</ul>
        <ActionForm action={scheduleAction} submit="บันทึกตารางงวด">
          <div className="field">
            <label className="label" htmlFor="op">ทำอะไร</label>
            <select id="op" name="op" className="select" defaultValue="move">
              <option value="move">ย้ายวันงวด</option>
              <option value="add">เพิ่มงวด</option>
              <option value="delete">ลบงวด (ลบเลขที่เลือกไว้ของงวดนี้ด้วย)</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="sd">วันที่งวด</label>
            <input id="sd" name="date" type="date" className="input" defaultValue={dates[0]} required />
          </div>
          <div className="field">
            <label className="label" htmlFor="to">ย้ายไปวันที่ (เฉพาะย้าย)</label>
            <input id="to" name="to" type="date" className="input" />
          </div>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="card__name">ดึงผลจากกองสลาก</h2>
        <ActionForm action={fetchResultAction} submit="ดึงผลตอนนี้">
          <div className="field">
            <label className="label" htmlFor="fd">วันที่งวด</label>
            <input id="fd" name="date" type="date" className="input" defaultValue={dates[0]} required />
          </div>
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="card__name">กรอกผลเอง</h2>
        <p className="meta">ใช้เมื่อดึงจากกองสลากไม่ได้ · แก้ผลงวดเก่าได้ แต้มจะคิดใหม่</p>
        <ActionForm action={saveResultAction} submit="บันทึกผล">
          {[
            ['date', 'วันที่งวด', 'date'],
            ['first', 'รางวัลที่ 1 (6 หลัก)', 'text'],
            ['front3', 'เลขหน้า 3 ตัว (2 ชุด เว้นวรรค)', 'text'],
            ['back3', 'เลขท้าย 3 ตัว (2 ชุด เว้นวรรค)', 'text'],
            ['last2', 'เลขท้าย 2 ตัว', 'text'],
          ].map(([name, label, type]) => (
            <div className="field" key={name}>
              <label className="label" htmlFor={`m-${name}`}>{label}</label>
              <input id={`m-${name}`} name={name} type={type} className="input" inputMode={type === 'text' ? 'numeric' : undefined} defaultValue={name === 'date' ? dates[0] : undefined} required />
            </div>
          ))}
        </ActionForm>
      </section>

      <section className="card">
        <h2 className="card__name">รีเซ็ต PIN</h2>
        <ActionForm action={resetPinAction} submit="รีเซ็ต PIN">
          <div className="field">
            <label className="label" htmlFor="pl">ผู้เล่น</label>
            <select id="pl" name="player" className="select">
              {(players.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="np">PIN ใหม่ 4 หลัก</label>
            <input id="np" name="pin" className="input" inputMode="numeric" maxLength={4} pattern="\d{4}" required />
          </div>
        </ActionForm>
      </section>

      <section>
        <h2 className="title">ผลวัดสูตร</h2>
        <p className="meta">
          Backtest ถึงงวด {bt.data ? thaiDate(bt.data.through_date) : '—'} · ทุกงวดสูตรเห็นแค่ข้อมูลก่อนหน้า · ตัวเลข = โอกาสถูกเมื่อสุ่มตามน้ำหนักสูตร เทียบกับสุ่มล้วน (1.00 = เท่าสุ่ม)
          · p = binomial ของ hit@10 · ผู้ใช้ไม่เห็นส่วนนี้
        </p>
        {tally && (
          <div style={{ overflowX: 'auto' }}>
            <table className="board">
              <thead>
                <tr>
                  <th scope="col">สูตร</th>
                  {Object.keys(TARGET_LABEL).map((t) => <th key={t} scope="col" className="num">{TARGET_LABEL[t]}</th>)}
                  <th scope="col" className="num">รางวัลที่ 1 รายหลัก</th>
                </tr>
              </thead>
              <tbody>
                {FORMULA_IDS.map((id) => {
                  const digits = [1, 2, 3, 4, 5, 6].map((i) => tally[id][`first_d${i}`])
                  const dRatio = digits.reduce((s, t) => s + t.pHit, 0) / digits.reduce((s, t) => s + t.chance, 0)
                  return (
                    <tr key={id}>
                      <td>{FORMULAS[id].name}</td>
                      {Object.keys(TARGET_LABEL).map((t) => {
                        const x = tally[id][t]
                        const p = binomSf(x.hit10, x.n, Math.min(1, (x.chance / x.n) * 10))
                        return (
                          <td key={t} className="num" style={{ fontSize: 'var(--text-md)' }}>
                            {(x.pHit / x.chance).toFixed(2)}
                            <span className="meta" style={{ display: 'block' }}>p={p < 0.01 ? p.toExponential(0) : p.toFixed(2)}</span>
                          </td>
                        )
                      })}
                      <td className="num" style={{ fontSize: 'var(--text-md)' }}>{dRatio.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
