// Build SQL that (re)creates the `preview` schema from the same migrations as `public`.
// Preview deployments use it (SUPABASE_DB_SCHEMA=preview), so testing never touches real data.
// Re-running wipes and rebuilds preview. Run: npm run preview:schema > /tmp/preview.sql, then execute it.
// Rule for future migrations: always qualify objects as `public.` so this rewrite stays correct.
import { readdirSync, readFileSync } from 'node:fs'

const dir = new URL('../supabase/migrations/', import.meta.url)
const body = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => `-- ${f}\n` + readFileSync(new URL(f, dir), 'utf8').replace(/\bpublic\./g, 'preview.').replace(/\bschema public\b/g, 'schema preview'))
  .join('\n')

process.stdout.write(`begin;
drop schema if exists preview cascade;
create schema preview;
grant usage on schema preview to service_role;
${body}
commit;
`)
