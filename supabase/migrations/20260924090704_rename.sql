-- Players may rename (= new login name) once every 15 days; enforced by a conditional update in lib/auth.ts.
alter table public.players add column renamed_at timestamptz;
