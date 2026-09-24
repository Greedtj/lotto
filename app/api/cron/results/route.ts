import { revalidateTag } from 'next/cache'
import { TAG } from '@/lib/data'
import { ingestDue } from '@/lib/ingest'

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return Response.json({ ok: false }, { status: 401 })
  const result = await ingestDue()
  if (result.done.length) Object.values(TAG).forEach((t) => revalidateTag(t, { expire: 0 }))
  return Response.json({ ok: true, ...result })
}
