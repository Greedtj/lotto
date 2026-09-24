# Lotto Lab

เว็บแอปมือถือ: สุ่มเลขหวยรัฐบาลจากสูตรสถิติ 8 สูตร เลือก 1 ชุดต่องวด แข่งกันว่าใครแม่นที่สุด (ถูก 1 หมวด = 1 แต้ม)

Next.js 16 (App Router, Cache Components) · TypeScript · Supabase Postgres · Vercel

## รันในเครื่อง

```bash
npm install
npx supabase@2.117.0 start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,realtime,storage-api,mailpit
cp .env.example .env.local      # ใส่ค่าจาก `supabase status` (port 5543x)
npm run seed                    # (ENV_FILE=.env.production.local npm run seed สำหรับ prod) 878 งวด + รางวัลครบจาก GLO + admin + backtest (--skip-glo ข้ามการดึง GLO)
npm run dev
npm test
```

## โครงสร้าง

| ที่ | ทำอะไร |
|---|---|
| `app/(app)/` | 5 แท็บ: สุ่ม `/` · ตรวจหวย `/check` · ประวัติ `/history` · อันดับ `/rank` · โปรไฟล์ `/me` |
| `app/(auth)/login` | เข้าสู่ระบบ / สมัคร (username + PIN 4 หลัก) |
| `app/admin` | จัดการงวด, ดึง/กรอกผล, รีเซ็ต PIN, ผลวัดสูตร (admin เท่านั้น) |
| `app/actions/` | Server Actions |
| `app/api/cron/results` | Vercel Cron ดึงผลจากกองสลาก |
| `lib/formulas/` | 8 สูตร: `f(history, K) → ความน่าจะเป็นของทุกเลข` |
| `lib/lottery/` | หมวดรางวัล, สุ่มตามน้ำหนัก, ตารางงวด/ปิดรับ, คิดแต้ม, ตรวจสลาก, backtest, อันดับ |
| `lib/data.ts` | อ่านข้อมูล + cache (`use cache` + tag `results` / `schedule` / `scores`) |
| `lib/ingest.ts` | บันทึกผล → คิดแต้ม → เปิดงวดถัดไป → อัปเดต backtest |
| `supabase/migrations/` | schema + Postgres functions (`create_roll`, `save_pick`, `leaderboard`) |
| `research/` | ต้นแบบ Python (`lotto.py`) ใช้เทียบผลสูตร, `draws.json`, script ดึงจาก myhora |
| `design.md` · `styles/tokens.css` | ระบบดีไซน์ (Hallmark) |
| `docs/PLAN.md` | แผนและข้อตกลงทั้งหมด |

## กติกาหลัก

- งวดปิดรับวันหวยออก 14:00 น. (เวลาไทย) จนกว่าผลจะเข้าระบบ · server เช็คทุกครั้ง (`draw_is_open` ใน DB)
- สุ่มได้สูตรละ `ROLLS_PER_FORMULA` ครั้งต่องวด · server เป็นคนสุ่ม ผู้ใช้ส่งแค่ `roll_id` จึงแก้เลขเองไม่ได้
- ผลเข้า 3 ทาง: cron รายวัน · ดึงอัตโนมัติเมื่อมีคนเปิดหน้าสุ่มหลัง 16:00 วันหวยออก · ปุ่ม admin
- DB: RLS เปิดทุกตาราง ไม่มี policy และไม่ grant ให้ anon/authenticated · แอปใช้ secret key ฝั่ง server เท่านั้น

## Env

ดู `.env.example` · production ตั้งใน Vercel (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SESSION_SECRET`, `CRON_SECRET`, `ADMIN_USERNAMES`, `ADMIN_PIN`, `ROLLS_PER_FORMULA`)
