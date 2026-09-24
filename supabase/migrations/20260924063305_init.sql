-- Lotto Formula Lab schema.
-- The app talks to the DB only from the server with the service_role key.
-- RLS on + no policies + no grants to anon/authenticated = nothing reachable from a browser.

create table public.players (
  id bigint generated always as identity primary key,
  username text not null check (char_length(username) between 2 and 20),
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index players_username_key on public.players (lower(username));

-- One row per draw: schedule + result (1:1, so one table).
create table public.draws (
  draw_date date primary key,
  status text not null default 'scheduled' check (status in ('scheduled', 'resulted')),
  first text check (first ~ '^\d{6,7}$'),
  front3 text[] not null default '{}',
  back3 text[] not null default '{}',
  last2 text check (last2 ~ '^\d{2}$'),
  second text[],
  third text[],
  fourth text[],
  fifth text[],
  near1 text[],
  source text check (source in ('myhora', 'glo', 'admin')),
  updated_at timestamptz not null default now(),
  check (status = 'scheduled' or (first is not null and last2 is not null))
);
create index draws_scheduled_idx on public.draws (draw_date) where status = 'scheduled';

-- Every server-generated set. Picks may only reference a roll, so numbers can't be forged.
create table public.rolls (
  id bigint generated always as identity primary key,
  player_id bigint not null references public.players (id) on delete cascade,
  draw_date date not null references public.draws (draw_date) on update cascade on delete cascade,
  formula text not null,
  seq smallint not null check (seq >= 1),
  numbers jsonb not null,
  created_at timestamptz not null default now(),
  unique (player_id, draw_date, formula, seq) -- concurrent rolls can't exceed the limit
);

-- One chosen set per player per draw. hit_* stay null until the draw is scored.
create table public.picks (
  player_id bigint not null references public.players (id) on delete cascade,
  draw_date date not null references public.draws (draw_date) on update cascade on delete cascade,
  roll_id bigint not null references public.rolls (id) on delete cascade,
  formula text not null,
  numbers jsonb not null,
  hit_first boolean,
  hit_top3 boolean,
  hit_top2 boolean,
  hit_front3 boolean,
  hit_back3 boolean,
  hit_last2 boolean,
  picked_at timestamptz not null default now(),
  primary key (player_id, draw_date)
);
create index picks_draw_date_idx on public.picks (draw_date);
create index picks_roll_id_idx on public.picks (roll_id);

-- Admin-only formula backtest, kept as running sums (one row).
create table public.backtest (
  id smallint primary key default 1 check (id = 1),
  through_date date not null,
  tally jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.players enable row level security;
alter table public.draws enable row level security;
alter table public.rolls enable row level security;
alter table public.picks enable row level security;
alter table public.backtest enable row level security;

-- ---------- functions (security invoker; only service_role may call) ----------

-- Open = earliest scheduled draw and before 14:00 Bangkok on its day.
create function public.draw_is_open(p_draw_date date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
      select 1 from public.draws d
      where d.draw_date = p_draw_date
        and d.status = 'scheduled'
        and now() < ((d.draw_date + time '14:00') at time zone 'Asia/Bangkok')
    )
    and not exists (
      select 1 from public.draws e where e.status = 'scheduled' and e.draw_date < p_draw_date
    )
$$;

-- One round trip: check window + roll count, then store the roll.
create function public.create_roll(p_player_id bigint, p_draw_date date, p_formula text, p_numbers jsonb, p_limit int)
returns public.rolls
language plpgsql
set search_path = ''
as $$
declare
  n int;
  r public.rolls;
begin
  if not public.draw_is_open(p_draw_date) then
    raise exception 'draw_closed';
  end if;
  select count(*) into n from public.rolls
  where player_id = p_player_id and draw_date = p_draw_date and formula = p_formula;
  if n >= p_limit then
    raise exception 'roll_limit';
  end if;
  insert into public.rolls (player_id, draw_date, formula, seq, numbers)
  values (p_player_id, p_draw_date, p_formula, n + 1, p_numbers)
  returning * into r;
  return r;
end
$$;

-- First pick creates, later picks update (one set per draw).
create function public.save_pick(p_player_id bigint, p_roll_id bigint)
returns public.picks
language plpgsql
set search_path = ''
as $$
declare
  r public.rolls;
  p public.picks;
begin
  select * into r from public.rolls where id = p_roll_id and player_id = p_player_id;
  if not found then
    raise exception 'roll_not_found';
  end if;
  if not public.draw_is_open(r.draw_date) then
    raise exception 'draw_closed';
  end if;
  insert into public.picks (player_id, draw_date, roll_id, formula, numbers)
  values (p_player_id, r.draw_date, r.id, r.formula, r.numbers)
  on conflict (player_id, draw_date) do update
    set roll_id = excluded.roll_id, formula = excluded.formula, numbers = excluded.numbers, picked_at = now()
  returning * into p;
  return p;
end
$$;

-- Points per category over a date range (scored picks only). Ranking is done by the caller per tab.
create function public.leaderboard(p_from date, p_to date)
returns table (
  player_id bigint, username text, played int,
  first int, top3 int, top2 int, front3 int, back3 int, last2 int
)
language sql
stable
set search_path = ''
as $$
  select pl.id, pl.username, count(*)::int,
    count(*) filter (where p.hit_first)::int,
    count(*) filter (where p.hit_top3)::int,
    count(*) filter (where p.hit_top2)::int,
    count(*) filter (where p.hit_front3)::int,
    count(*) filter (where p.hit_back3)::int,
    count(*) filter (where p.hit_last2)::int
  from public.picks p
  join public.players pl on pl.id = p.player_id
  where p.hit_first is not null and p.draw_date between p_from and p_to
  group by pl.id, pl.username
$$;

-- ---------- privileges ----------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
