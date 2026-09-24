# Lotto Lab

เว็บแอปมือถือ: สุ่มเลขหวยรัฐบาลจากสูตรสถิติ 8 สูตร เลือก 1 ชุดต่องวด แข่งกันว่าใครแม่นที่สุด (ถูก 1 หมวด = 1 แต้ม)

Next.js 16 (App Router, Cache Components) · TypeScript · Supabase Postgres · Vercel

## รันในเครื่อง

```bash
npm install
npx supabase@2.117.0 start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,realtime,storage-api,mailpit
cp .env.example .env.local      # ใส่ค่าจาก `supabase status` (port 5543x)
npm run seed                    # 878 งวด + รางวัลครบจาก GLO + admin + backtest (--skip-glo ข้ามการดึง GLO)
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
| `supabase/migrations/` | schema + Postgres functions (`create_roll_batch`, `save_pick`, `leaderboard`) |
| `research/` | ต้นแบบ Python (`lotto.py`) ใช้เทียบผลสูตร, `draws.json`, script ดึงจาก myhora |
| `design.md` · `styles/tokens.css` | ระบบดีไซน์ (Hallmark) |
| `docs/PLAN.md` | แผนและข้อตกลงทั้งหมด |

## กติกาหลัก

- งวดปิดรับวันหวยออก 14:00 น. (เวลาไทย) จนกว่าผลจะเข้าระบบ · server เช็คทุกครั้ง (`draw_is_open` ใน DB)
- กดสุ่มครั้งเดียวได้ชุดเลขครบ 8 สูตร · admin ตั้งโหมดวันละ 1 / 3 / ไม่จำกัด และรีเซ็ตสิทธิ์ทุกคนได้ (นับใหม่ทุก 00:00 เวลาไทย) · server เป็นคนสุ่ม ผู้ใช้ส่งแค่ `roll_id` จึงแก้เลขเองไม่ได้
- ผลเข้า 3 ทาง: cron รายวัน · ดึงอัตโนมัติเมื่อมีคนเปิดหน้าสุ่มหลัง 16:00 วันหวยออก · ปุ่ม admin
- DB: RLS เปิดทุกตาราง ไม่มี policy และไม่ grant ให้ anon/authenticated · แอปใช้ secret key ฝั่ง server เท่านั้น

## Env

ดู `.env.example` · production ตั้งใน Vercel (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SESSION_SECRET`, `CRON_SECRET`, `ADMIN_USERNAMES`, `ADMIN_PIN` ใช้ตอน seed เท่านั้น)

## Production

- URL: https://lottoth.vercel.app (สำรอง: lotto-one-alpha.vercel.app) · Vercel project `greedtjs-projects/lotto` (functions `sin1`)
- Supabase `lotto` (ap-southeast-1, free) เชื่อมผ่าน Vercel integration `supabase-lotto` → env `SUPABASE_URL` / `SUPABASE_SECRET_KEY` ตั้งให้อัตโนมัติ
- Seed / สคริปต์กับ DB จริง: **ห้ามรันจากโฟลเดอร์โปรเจค** เพราะ `vercel env run` จะอ่าน `.env.local` (DB ในเครื่อง) ทับค่า production ให้รันจากโฟลเดอร์ที่มีแค่ `.vercel/project.json`:
  ```bash
  mkdir -p /tmp/lotto-prod/.vercel && cp .vercel/project.json /tmp/lotto-prod/.vercel/ && cd /tmp/lotto-prod
  ADMIN_PIN=xxxx vercel env run -e production -- <repo>/node_modules/.bin/tsx --tsconfig <repo>/tsconfig.json <repo>/scripts/seed.ts
  ```
- Deploy: push `main` → Vercel deploy production อัตโนมัติ · branch อื่น → preview URL · สำรอง: `vercel deploy --prod` (`.vercelignore` กัน `.env*`)
- GitHub: https://github.com/Greedtj/lotto

### Preview (แยกข้อมูลจาก production)

- Vercel Preview ใช้ schema `preview` ในโปรเจค Supabase เดียวกัน (`SUPABASE_DB_SCHEMA=preview` ตั้งเฉพาะ Preview) · production ใช้ `public`
- สร้าง/รีเซ็ต schema: `npm run preview:schema` สร้าง SQL จาก `supabase/migrations/*` (แปลง `public.` → `preview.`) แล้วรันใน SQL editor · **รันซ้ำ = ล้างข้อมูล preview**
- migration ใหม่ทุกไฟล์ต้องเขียน `public.` นำหน้าทุก object และรันกับ preview ด้วย
- seed preview: เหมือน seed production แต่เพิ่ม `SUPABASE_DB_SCHEMA=preview` (ข้าม GLO ได้ด้วย `--skip-glo`)
- ต้องเปิด `preview` ใน Supabase → Data API → Exposed schemas
