-- DB rule checks. Runs in a transaction and rolls back.
-- docker exec -i supabase_db_lotto psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/integrity.sql
begin;

create function pg_temp.expect_error(sql text, msg text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'expected error "%" but none: %', msg, sql;
exception when others then
  if sqlerrm <> msg then raise exception 'expected "%" got "%" for %', msg, sqlerrm, sql; end if;
end $$;

insert into players (username, pin_hash) values ('t_a', 'x'), ('t_b', 'x');
-- open draw = 2026-10-01 (seeded)

do $$
declare a bigint := (select id from players where username = 't_a');
        b bigint := (select id from players where username = 't_b');
        r1 bigint; r2 bigint; rb bigint;
begin
  r1 := (select id from create_roll(a, '2026-10-01', 'hot', '{"x":1}', 3));
  r2 := (select id from create_roll(a, '2026-10-01', 'hot', '{"x":2}', 3));
  perform create_roll(a, '2026-10-01', 'hot', '{"x":3}', 3);
  perform pg_temp.expect_error(format('select create_roll(%s, %L, %L, %L, 3)', a, '2026-10-01', 'hot', '{}'), 'roll_limit');
  perform create_roll(a, '2026-10-01', 'cold', '{}', 3); -- limit is per formula

  perform save_pick(a, r1);
  perform save_pick(a, r2);
  assert (select count(*) from picks where player_id = a) = 1, 'second pick must update, not insert';
  assert (select roll_id from picks where player_id = a) = r2, 'pick must point at latest roll';

  rb := (select id from create_roll(b, '2026-10-01', 'hot', '{}', 3));
  perform pg_temp.expect_error(format('select save_pick(%s, %s)', a, rb), 'roll_not_found');

  -- an earlier unresulted draw already past 14:00 blocks everything
  insert into draws (draw_date, status) values ('2026-09-23', 'scheduled');
  perform pg_temp.expect_error(format('select create_roll(%s, %L, %L, %L, 3)', b, '2026-10-01', 'cold', '{}'), 'draw_closed');
  perform pg_temp.expect_error(format('select create_roll(%s, %L, %L, %L, 3)', b, '2026-09-23', 'cold', '{}'), 'draw_closed');
  perform pg_temp.expect_error(format('select save_pick(%s, %s)', b, rb), 'draw_closed');
  raise notice 'integrity: all checks passed';
end $$;

rollback;
