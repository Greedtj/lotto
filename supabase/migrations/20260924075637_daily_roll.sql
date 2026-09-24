-- One roll per player per Bangkok day: a single press generates a set for every formula.
-- (replaces "3 rolls per formula per draw")

alter table public.rolls drop constraint rolls_player_id_draw_date_formula_seq_key;
alter table public.rolls drop column seq;
alter table public.rolls add column roll_day date not null default ((now() at time zone 'Asia/Bangkok')::date);
-- a second batch on the same day collides here, even from two tabs at once
create unique index rolls_player_day_formula_key on public.rolls (player_id, roll_day, formula);
create index rolls_player_draw_idx on public.rolls (player_id, draw_date);

drop function public.create_roll(bigint, date, text, jsonb, int);

-- p_sets = { "<formula>": <numbers>, ... } for every formula.
create function public.create_roll_batch(p_player_id bigint, p_draw_date date, p_sets jsonb)
returns setof public.rolls
language plpgsql
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if not public.draw_is_open(p_draw_date) then
    raise exception 'draw_closed';
  end if;
  if exists (select 1 from public.rolls where player_id = p_player_id and roll_day = today) then
    raise exception 'rolled_today';
  end if;
  return query
    insert into public.rolls (player_id, draw_date, formula, numbers, roll_day)
    select p_player_id, p_draw_date, s.key, s.value, today
    from jsonb_each(p_sets) s
    returning *;
end
$$;

revoke all on function public.create_roll_batch(bigint, date, jsonb) from public, anon, authenticated;
grant execute on function public.create_roll_batch(bigint, date, jsonb) to service_role;
