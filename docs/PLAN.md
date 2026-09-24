# Lotto Formula Lab v2 — แผนก่อนลงมือ

สถานะ: **ขั้น 0–4 เสร็จ (2026-09-24) · ขั้น 5–6 รอคุณ** · เขียน 2026-09-24 · แก้ 2026-09-24 (ยืนยัน 6 หมวด, แท็บรวม, ย้ายไฟล์, ซ่อนผลวัดสูตร, pagination, performance)

ย้ายจาก prototype (Python ในเครื่อง) ไปเป็นเว็บแอปสำหรับมือถือ มีผู้ใช้หลายคน แข่งกันเลือกชุดเลขจากสูตร deploy บน Vercel ใช้ Supabase เป็น DB

---

## 1. สิ่งที่ตกลงกันแล้ว

| เรื่อง | ข้อสรุป |
|---|---|
| Stack | Next.js (App Router) + TypeScript ทั้งหมด · Supabase Postgres · Vercel |
| ผลหวยงวดใหม่ | Vercel Cron ดึงจาก API กองสลาก (glo.or.th) + admin กดดึงเอง/กรอกเอง |
| วิธีสุ่ม | สุ่มตามน้ำหนักของสูตร (สุ่มจาก distribution ของสูตร ไม่ใช่เอาอันดับ 1) |
| 1 ชุด | 6 หมวด สุ่มแยกกัน: **รางวัลที่ 1 · 3 ตัวบน · 2 ตัวบน · 3 ตัวหน้า · 3 ตัวท้าย · 2 ตัวล่าง** |
| สุ่มใหม่ | สูตรละ **3 ครั้ง/งวด** นับที่ server (ปรับได้ใน env `ROLLS_PER_FORMULA`) |
| แก้เลขเอง | ไม่ได้ ต้องมาจากสูตรเท่านั้น ทุกชุดบันทึกว่ามาจากสูตรไหน |
| เก็บชุด | 1 ชุด/คน/งวด · กดเลือกครั้งแรก = create · ครั้งต่อไป = update |
| ปิดรับ | วันหวยออก **14:00 น. (เวลาไทย)** จนกว่าผลจะเข้าระบบ แล้วเปิดรับงวดถัดไปทันที |
| วันหวยออก | ค่าเริ่มต้นวันที่ 1 / 16 · admin เลื่อน/เพิ่ม/ลบงวดได้ |
| คิดแต้ม | แยกหมวด ถูก = 1 ไม่ถูก = 0 ไม่มีถ่วงน้ำหนัก |
| อันดับ | แท็บ **รวม** (บวกแต้มทุกหมวดตรงๆ) + แท็บแยก 6 หมวด · เท่ากัน = อันดับร่วม (1 ร่วม, 2 ร่วม — dense rank) · กรองเดือน/ปี/ตลอดกาล |
| บัญชี | username (เป็นชื่อแสดงด้วย) + PIN 4 หลัก · สมัครเองได้ · admin รีเซ็ต PIN |
| Admin | username ที่อยู่ใน env `ADMIN_USERNAMES` |
| เมนู | แถบลอยด้านล่าง 5 แท็บ: **สุ่ม · ตรวจหวย · ประวัติ · อันดับ · โปรไฟล์** |
| ประวัติ | 2 แท็บย่อย: ผลหวยจริงทุกงวด / เลขที่ฉันเลือก · **แบ่งหน้า** ครั้งละ 20 งวด (ปุ่ม "ดูเพิ่ม") |
| ตรวจหวย | เลือกงวด + พิมพ์เลขสลาก 6 หลัก → บอกว่าถูกรางวัลอะไร |
| ผลวัดสูตร | **ผู้ใช้ไม่เห็น** ผู้ใช้เห็นแค่ชื่อสูตรบนการ์ดสุ่ม · backtest และสถิติความแม่นของแต่ละสูตรอยู่ในหน้า admin เท่านั้น |
| หน้าตา | ยึด DNA ของ Hallmark custom-04 + ฟอนต์ไทยคู่ + dark mode |

ผู้ใช้มีแค่ 4 งาน: **สุ่ม/เลือกเลข · ดูอันดับ · ดูประวัติ · ตรวจหวย**

---

## 2. โครงสร้างโปรเจค

คุณขอให้แยกส่วนชัดเจน จึงแบ่งไฟล์ตามหน้าที่ (มากกว่าตอนเป็น prototype)

```
lotto/
├─ app/
│  ├─ (auth)/login/page.tsx          เข้าสู่ระบบ / สมัคร
│  ├─ (app)/layout.tsx               แถบเมนูลอยด้านล่าง
│  ├─ (app)/page.tsx                 สุ่ม
│  ├─ (app)/check/page.tsx           ตรวจหวย
│  ├─ (app)/history/page.tsx         ประวัติ (ผลหวย | เลขที่ฉันเลือก)
│  ├─ (app)/rank/page.tsx            อันดับ (รวม | 6 หมวด)
│  ├─ (app)/me/page.tsx              โปรไฟล์ + สถิติที่ทายไว้
│  ├─ admin/page.tsx                 จัดการงวด / ผล / รีเซ็ต PIN / ผลวัดสูตร
│  ├─ actions/                       Server Actions (roll, pick, login, admin)
│  └─ api/cron/results/route.ts      Cron ดึงผลหวย
├─ components/                       UI (BottomNav, NumberSet, RankTable, …)
├─ lib/
│  ├─ formulas/                      8 สูตร แยกไฟล์ละสูตร + index
│  ├─ lottery/targets.ts             นิยาม 6 หมวด + ดึงค่าจากผลหวย
│  ├─ lottery/schedule.ts            คำนวณงวดถัดไป / เวลาปิดรับ (Asia/Bangkok)
│  ├─ lottery/scoring.ts             ตรวจแต้มชุดเลข
│  ├─ lottery/check.ts               ตรวจสลาก 6 หลัก ทุกรางวัล
│  ├─ glo.ts                         client API กองสลาก
│  ├─ auth.ts                        PIN hash, session cookie, lockout
│  └─ db.ts                          Supabase client (server เท่านั้น)
├─ supabase/migrations/*.sql         schema
├─ scripts/                          seed-draws.ts, backfill-glo.ts, backtest.ts
├─ research/                         lotto.py + draws.json + scrape_myhora.js (ต้นแบบ Python ใช้เป็นตัวเทียบผล)
├─ tests/                            vitest
├─ styles/tokens.css
├─ design.md                         ระบบดีไซน์ที่ล็อกไว้ (Hallmark)
└─ docs/PLAN.md
```

**ไฟล์เดิมที่จะย้าย/ลบ (คุณยืนยันแล้ว):**

| ไฟล์ | ทำอะไร |
|---|---|
| `lotto.py` | ย้ายไป `research/lotto.py` (ใช้เป็นตัวเทียบว่าสูตร TS คำนวณตรงกับ Python) |
| `data/draws.json` | ย้ายไป `research/draws.json` (ใช้ seed DB) |
| `scripts/scrape_myhora.js` | ย้ายไป `research/` |
| `server.py`, `static/index.html` | **ลบ** (Next.js ทำแทน) |
| `data/backtest.json` | **ลบ** (คำนวณใหม่เก็บใน DB) |
| `README.md` | เขียนใหม่ |

---

## 3. ฐานข้อมูล (Supabase)

ทุกตารางเปิด RLS และไม่มี policy (ปฏิเสธทุกอย่าง) · แอปเข้าถึง DB ผ่าน server ด้วย service-role key เท่านั้น · ไม่ส่ง anon key ไปที่ browser

| ตาราง | คอลัมน์หลัก |
|---|---|
| `users` | id, username (NFC, unique), pin_hash, failed_attempts, locked_until, created_at |
| `draws` | id, draw_date (unique), lock_at (timestamptz), status (`scheduled`/`locked`/`resulted`), source (`myhora`/`glo`/`admin`) |
| `draw_results` | draw_id, first, front3[], back3[], last2, second[], third[], fourth[], fifth[], near1[] (รางวัล 2–5 มีเฉพาะงวดที่ GLO มีข้อมูล) |
| `rolls` | id, user_id, draw_id, formula, seq (1–3), numbers (jsonb 6 หมวด), created_at · **unique(user_id, draw_id, formula, seq)** + check seq ≤ limit → สุ่มเกินไม่ได้แม้กดพร้อมกันหลายแท็บ |
| `picks` | user_id, draw_id, roll_id, formula, numbers, hit_first, hit_top3, hit_top2, hit_front3, hit_back3, hit_last2 · **unique(user_id, draw_id)** |
| `backtest_results` | formula, target, metrics (jsonb), computed_at |

- **กันโกง:** server เป็นคนสุ่มและเก็บลง `rolls` ตอนกดเลือก ส่งแค่ `roll_id` ไป server จะเช็คว่า roll นั้นเป็นของ user นี้ งวดนี้ และยังไม่ปิดรับ จึงแก้เลขผ่าน devtools ไม่ได้
- **อันดับ:** SQL function คืนผลรวมแต้มต่อหมวด + รวม ตามช่วงเวลา + `dense_rank()`
- **ประวัติ:** แบ่งหน้าแบบ keyset (`where draw_date < :cursor order by draw_date desc limit 20`) ไม่ใช้ OFFSET · index `draws(draw_date desc)`, `picks(user_id, draw_id)`
- **Seed:** นำเข้า 878 งวดจาก `draws.json` แล้วเติมรางวัลที่ 2–5 จาก GLO (ยืนยันแล้วว่ามีตั้งแต่ปี 2010 เป็นอย่างน้อย จะหาปีแรกสุดที่มีข้อมูล) งวดที่มีทั้งสองแหล่ง ต้องเช็คว่า `first` และ `last2` ตรงกัน

---

## 4. กฎหลัก (pure function + มี test)

**สูตร (port จาก Python)**
- Interface: `f(history: number[][], K) → number[K]` (1 งวดมีได้หลายค่า เช่น 3 ตัวท้ายมี 2 หรือ 4 ตัว)
- สูตรที่นับความถี่ นับทุกค่าในงวด · Markov นับการเปลี่ยนทุกคู่ (ค่าในงวดก่อน → ค่าในงวดถัดไป) แยกหลัก
- 3 ตัวหน้ามีตั้งแต่ปี 2015 (ประมาณ 216 งวด) · 3 ตัวท้ายก่อนปี 2015 มี 4 ค่า หลังจากนั้นมี 2 ค่า
- ถ้าเลขที่เลือกตรงกับค่าใดค่าหนึ่งที่ออกในงวดนั้น นับว่าถูก
- Test เทียบกับ Python: last2, top2, top3, รางวัลที่ 1 แต่ละหลัก ต้องได้ distribution ตรงกัน · หมวดที่มีหลายค่าต่องวดมี test แยก

**ตารางงวด** (`schedule.ts`) ใช้เวลา Asia/Bangkok (UTC+7) เสมอ เพราะ Vercel รันเป็น UTC
- งวดที่เปิดรับ = งวด `scheduled` ที่ใกล้ที่สุดและยังไม่ถึง `lock_at` · ถ้ามีงวดที่ `locked` อยู่ (ปิดแล้วแต่ผลยังไม่มา) = ปิดรับทั้งหมด
- ผลเข้าแล้ว → สร้างงวดถัดไปตามค่าเริ่มต้น 1/16 ถ้ายังไม่มี
- server เช็คเวลาปิดรับทุกครั้ง ไม่ใช่แค่ซ่อนปุ่มในหน้าเว็บ
- Test: 13:59:59 กับ 14:00:00 (+07) · เวลา UTC ดึกที่ในไทยเป็นวันหวยออกแล้ว · ผลเข้า → งวดถัดไปเปิด · งวดพิเศษจากข้อมูลจริง (30 ธ.ค. แล้วต่อด้วย 17 ม.ค., 2 พ.ค., 31 ก.ค.)

**ตรวจหวย** (`check.ts`) งวดเก่าที่มีแค่ข้อมูล myhora (รางวัลหลักอย่างเดียว) → ขึ้นข้อความว่า "งวดนี้มีข้อมูลเฉพาะรางวัลหลัก" แทนการบอกว่า "ไม่ถูกรางวัล" · ปี 1990–94 รางวัลที่ 1 มี 7 หลัก ต้องจัดการแยก

---

## 5. บัญชีผู้ใช้

- username: ตัด space หัวท้าย, NFC normalize, 2–20 ตัวอักษร, ไม่ซ้ำ
- PIN 4 หลัก เก็บเป็น bcrypt hash · ผิด 5 ครั้ง → ล็อก 15 นาที (นับแยกตาม username)
- session: signed httpOnly cookie อายุ 30 วัน
- **กันแย่งชื่อ admin:** สร้างบัญชี admin ตอน seed และระบบไม่ให้ใครสมัครชื่อที่อยู่ใน `ADMIN_USERNAMES`
- PIN 4 หลักเป็นระบบแยกตัวคน ไม่ใช่ความปลอดภัยจริงจัง (ตามที่คุณขอ)

---

## 6. การดึงผลหวย

- `GET /api/cron/results` เช็ค `CRON_SECRET` · ดึงจาก GLO `getLotteryResult` ตามวันที่ · บันทึกซ้ำได้ไม่เพิ่มข้อมูลซ้ำ · ต้องได้ผลครบก่อนเปลี่ยนสถานะเป็น `resulted` · คิดแต้มทุก pick ของงวดนั้น
- **ต้องตรวจสอบตอน deploy:** แผน Hobby ของ Vercel น่าจะให้ cron รันได้วันละครั้ง และเวลาไม่แม่น จึงวางไว้ 3 ทาง:
  1. cron รายวัน
  2. **ดึงเมื่อมีคนเปิดแอป** — ถ้าเลยเวลาหวยออกแล้วผลยังไม่มา ดึงให้เลย
  3. ปุ่ม "ดึงผลตอนนี้" ของ admin
- admin แก้ผล → คิดแต้มงวดนั้นใหม่
- ต้องทดสอบเรียก GLO จาก Vercel ตั้งแต่ต้น เผื่อ GLO บล็อก IP ของ Vercel
- Supabase free tier จะพักโปรเจคถ้าไม่มีการใช้งาน 7 วัน · cron รายวันช่วยให้ยังทำงานอยู่ (ต้องเช็คอีกที)

---

## 7. หน้าตา (Hallmark · studied-DNA จาก custom-04)

**กลุ่มผู้ใช้:** เพื่อนกลุ่มเล็ก ใช้มือถือ · **งานหลัก:** สุ่ม → เลือก 1 ชุดต่องวด → ดูอันดับ · **โทน:** กระดาษหนังสือพิมพ์ + พิมพ์ริโซ

- **สี:** พื้นครีม · หมึกดำ · แดงเป็นสีเน้น · มี dark mode (พื้นกระดาษเข้ม หมึกครีม)
- **ฟอนต์ (เสนอ):** หัวข้อ/ตัวเลข Big Shoulders Display + Kanit (ไทย) · เนื้อความ Fraunces + Noto Serif Thai · ป้ายกำกับ Spline Sans Mono + Anuphan · ใส่ฟอนต์อังกฤษก่อน ตัวไทยจะใช้ฟอนต์ไทยแทนเอง · จำกัดจำนวน weight
- **ไม่มีตัวเอียง** โดยเฉพาะภาษาไทย
- **เอฟเฟกต์ริโซ (สีเหลื่อม)** ใช้กับหัวข้อตกแต่งเท่านั้น **ห้ามใช้กับตัวเลขที่ต้องอ่าน/ตรวจ**
- **แถบเมนู (N5 floating pill):** ลอยด้านล่าง โค้งมน · ไอคอน 5 อัน · แท็บที่เปิดอยู่มีพื้นเน้น · แท็บโปรไฟล์ใช้วงกลมอักษรย่อชื่อ · กดง่าย ≥44px · รองรับ safe-area ของ iPhone · มี aria-label / aria-current · เนื้อหามี padding ล่างเผื่อแถบ
- เช็คหน้าจอที่ 320 / 375 / 414 px · ไม่มี scroll แนวนอน
- ล็อกระบบดีไซน์ลง `design.md` ทุกหน้าใช้ร่วมกัน

**หน้าสุ่ม:** ป้ายงวด + นับถอยหลังถึงเวลาปิดรับ · การ์ด 8 สูตร แต่ละใบมีชุด 6 หมวด + ปุ่ม "สุ่ม (เหลือ 2/3)" + ปุ่ม "เลือกชุดนี้" · ชุดที่เลือกไว้แล้วมีป้ายกำกับ · ปิดรับ → ปุ่มกดไม่ได้ + บอกเหตุผล

---

## 8. Performance

**ตัวที่ทำให้ช้าจริงคือการรอ network (DB, cold start) ไม่ใช่การคำนวณ** สุ่ม 1 ครั้งใน TS ใช้ไม่ถึง 1 ms ส่วนการเรียก DB ข้ามประเทศใช้ครั้งละ 50–200 ms แผนเลยเน้นลดจำนวนครั้งที่เรียก DB

| # | ทำอะไร | ได้อะไร |
|---|---|---|
| P1 | **Vercel function กับ Supabase อยู่ region เดียวกัน** (สิงคโปร์: `sin1` / `ap-southeast-1`) | ลดเวลาทุก request มากที่สุด ทำครั้งเดียวตอนตั้งค่า |
| P2 | **Cache distribution ของทุกสูตรต่องวด** — ทุกคนในงวดเดียวกันใช้ประวัติชุดเดียวกัน distribution จึงเหมือนกันทุกคน คำนวณครั้งเดียวแล้วเก็บใน cache ของ Next.js (`use cache` + tag ตามงวด) ผลใหม่เข้าแล้วล้าง tag | กดสุ่มแค่หยิบจาก cache แล้วสุ่ม ไม่ต้องโหลดประวัติ 880 งวดทุกครั้ง |
| P3 | **สุ่มจาก CDF** — ทำตารางสะสมความน่าจะเป็นเก็บใน cache สุ่มด้วย binary search | O(log K) ต่อหมวด |
| P4 | **สุ่ม + เช็คสิทธิ์ ใน DB call เดียว** — Postgres function เดียวเช็คเวลาปิดรับ + จำนวนครั้ง + บันทึก roll · กดเลือกก็ call เดียว (upsert) | 1 round trip ต่อการกด · ป้องกันกดพร้อมกันหลายแท็บด้วย unique constraint |
| P5 | **Cache ข้อมูลที่เปลี่ยนแค่ตอนผลเข้า** — ผลหวยทั้งหมด, หน้าประวัติผลหวย, ตารางอันดับ ใช้ tag `results` ล้างตอนผลเข้า/admin แก้ผล | เปิดหน้าอันดับ/ประวัติแทบไม่แตะ DB |
| P6 | **Pagination แบบ keyset + index** (ข้อ 3) | หน้าที่ 40 เร็วเท่าหน้าแรก |
| P7 | **อันดับคำนวณใน SQL** (`sum` + `dense_rank`) ส่งกลับแค่ตารางที่แสดง | ไม่โหลด pick ทั้งหมดมาคิดในแอป |
| P8 | **Backtest แบบเพิ่มทีละงวด** — ผลใหม่เข้า คำนวณแค่งวดใหม่ 1 ขั้นแล้วบวกเข้าผลเดิม ไม่ต้องรันใหม่ 778 งวด (อยู่หน้า admin) | ไม่มีงานหนักตอนผลเข้า |
| P9 | **หน้าเว็บเบา** — Server Components เป็นหลัก ส่ง JS เฉพาะปุ่มกด · ฟอนต์ self-host ผ่าน `next/font` ตัด subset (thai + latin) และจำกัด weight · ไอคอนเป็น SVG inline | โหลดไวบนเน็ตมือถือ |
| P10 | **Optimistic UI** — กด "เลือกชุดนี้" แล้วขึ้นว่าเลือกแล้วทันที ถ้า server ปฏิเสธค่อยย้อนกลับ | รู้สึกเร็วแม้เน็ตช้า |

**ไม่ทำ (ยังไม่จำเป็น):** ตาราง precompute ใน DB, Redis, materialized view · ข้อมูลน้อย (ไม่กี่พันแถว) cache ของ Next.js + index พอแล้ว ถ้าวัดแล้วช้าค่อยเพิ่ม

**วัดผล:** log เวลาของ roll/pick action · เป้าหมาย: กดสุ่ม < 300 ms (ไม่นับ cold start) เช็คด้วย Vercel logs หลัง deploy

---

## 9. ขั้นตอน (แต่ละขั้นมีวิธีเช็ค)

| # | งาน | เช็คยังไง | Skills |
|---|---|---|---|
| 0 | ย้ายไฟล์ตามตารางข้อ 2 · สร้าง Next.js + TS + vitest · `.gitignore` (`.env*`, `.playwright-mcp/`, cache) | `npm run build` ผ่าน | vercel:nextjs |
| 1 | `lib/` ทั้งหมด: สูตร, หมวด, ตารางงวด, คิดแต้ม, ตรวจหวย | vitest ผ่าน + ผลเทียบกับ Python ตรงกัน | ponytail |
| 2 | Migrations + seed 878 งวด + เติมผลจาก GLO | จำนวนแถวถูก · first/last2 ตรงกันทุกงวดที่มีสองแหล่ง | supabase ×2 |
| 3 | บัญชีผู้ใช้ + Server Actions (สุ่ม/เลือก จำกัดครั้ง + ปิดรับ) + cron + admin + cache (ข้อ 8) | test: สุ่มครั้งที่ 4 ถูกปฏิเสธ · เลือกหลังปิดรับถูกปฏิเสธ · pick ซ้ำ = update · ผลเข้าแล้ว cache ล้าง | vercel:vercel-functions, env-vars, next-cache-components |
| 4 | UI 5 แท็บ + admin ตาม design.md | Playwright ที่ 320/375/414 · ตรวจ a11y · ประวัติกด "ดูเพิ่ม" ได้ถึงงวดแรก | hallmark, frontend-design, fixing-accessibility |
| 5 | Deploy: เชื่อม Supabase ผ่าน Vercel Marketplace, env, cron · ทดสอบเรียก GLO จาก Vercel | ใช้งานจริงบนมือถือได้ครบ flow | vercel:marketplace, deployments-cicd |
| 6 | `git init` + `gh repo create` + push | **ทำเมื่อคุณสั่งเท่านั้น** | — |

**Env ที่ต้องใช้:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `CRON_SECRET`, `ADMIN_USERNAMES`, `ROLLS_PER_FORMULA=3`
