-- Admin-controlled roll policy: 1 or 3 rolls per day, or unlimited, plus a "reset everyone now" button.
-- A roll = one batch (one set per formula). Usage counts batches since
-- max(today 00:00 Bangkok, last reset).

create table public.settings (
  id smallint primary key default 1 check (id = 1),
  rolls_per_day int check (rolls_per_day is null or rolls_per_day > 0), -- null = unlimited
  rolls_reset_at timestamptz not null default '-infinity',
  updated_at timestamptz not null default now()
);
insert into public.settings (id, rolls_per_day) values (1, 1);
alter table public.settings enable row level security;

-- several batches per day are allowed now; the per-player lock in create_roll_batch keeps counting exact
drop index public.rolls_player_day_formula_key;
alter table public.rolls add column batch uuid;
update public.rolls set batch = md5(player_id::text || roll_day::text)::uuid where batch is null; -- legacy: one batch per player-day
alter table public.rolls alter column batch set not null;
create index rolls_player_created_idx on public.rolls (player_id, created_at);

-- Start of the current counting window.
create function public.roll_window_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select greatest(
    ((now() at time zone 'Asia/Bangkok')::date::timestamp) at time zone 'Asia/Bangkok',
    (select s.rolls_reset_at from public.settings s where s.id = 1)
  )
$$;

-- used = batches in the current window; per_day null = unlimited.
create function public.roll_status(p_player_id bigint)
returns table (used int, per_day int)
language sql
stable
set search_path = ''
as $$
  select
    (select count(distinct r.batch)::int from public.rolls r where r.player_id = p_player_id and r.created_at >= public.roll_window_start()),
    (select s.rolls_per_day from public.settings s where s.id = 1)
$$;

drop function public.create_roll_batch(bigint, date, jsonb);

create function public.create_roll_batch(p_player_id bigint, p_draw_date date, p_sets jsonb)
returns setof public.rolls
language plpgsql
set search_path = ''
as $$
declare
  st record;
  b uuid := gen_random_uuid();
begin
  -- serialize this player's rolls so two tabs can't both take the last one
  perform pg_advisory_xact_lock(hashtext('roll'), p_player_id::int);
  if not public.draw_is_open(p_draw_date) then
    raise exception 'draw_closed';
  end if;
  select * into st from public.roll_status(p_player_id);
  if st.per_day is not null and st.used >= st.per_day then
    raise exception 'roll_limit';
  end if;
  return query
    insert into public.rolls (player_id, draw_date, formula, numbers, batch)
    select p_player_id, p_draw_date, s.key, s.value, b
    from jsonb_each(p_sets) s
    returning *;
end
$$;

revoke all on public.settings from anon, authenticated;
grant select, insert, update, delete on public.settings to service_role;
revoke all on function public.roll_window_start() from public, anon, authenticated;
revoke all on function public.roll_status(bigint) from public, anon, authenticated;
revoke all on function public.create_roll_batch(bigint, date, jsonb) from public, anon, authenticated;
grant execute on function public.roll_window_start() to service_role;
grant execute on function public.roll_status(bigint) to service_role;
grant execute on function public.create_roll_batch(bigint, date, jsonb) to service_role;
