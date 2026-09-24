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
  -- mode: 1 per day
  update settings set rolls_per_day = 1, rolls_reset_at = '-infinity';
  perform create_roll_batch(a, '2026-10-01', '{"hot":{"x":1},"cold":{"x":2}}');
  assert (select count(*) from rolls where player_id = a) = 2, 'batch inserts one roll per formula';
  assert (select used from roll_status(a)) = 1, 'one batch used';
  perform pg_temp.expect_error(format('select create_roll_batch(%s, %L, %L)', a, '2026-10-01', '{"hot":{}}'), 'roll_limit');

  -- admin reset: everyone gets the day's allowance back
  update settings set rolls_reset_at = now();
  update rolls set created_at = created_at - interval '1 second'; -- rolled before the reset (one txn = one now())
  assert (select used from roll_status(a)) = 0, 'reset clears usage';
  perform create_roll_batch(a, '2026-10-01', '{"hot":{"x":3}}');
  perform pg_temp.expect_error(format('select create_roll_batch(%s, %L, %L)', a, '2026-10-01', '{"hot":{}}'), 'roll_limit');

  -- mode: 3 per day (counts batches since the reset)
  update settings set rolls_per_day = 3;
  perform create_roll_batch(a, '2026-10-01', '{"hot":{"x":4}}');
  perform create_roll_batch(a, '2026-10-01', '{"hot":{"x":5}}');
  perform pg_temp.expect_error(format('select create_roll_batch(%s, %L, %L)', a, '2026-10-01', '{"hot":{}}'), 'roll_limit');

  -- mode: unlimited
  update settings set rolls_per_day = null;
  perform create_roll_batch(a, '2026-10-01', '{"hot":{"x":6}}');
  assert (select per_day from roll_status(a)) is null, 'unlimited';

  -- yesterday's batches never count
  update settings set rolls_per_day = 1, rolls_reset_at = '-infinity';
  update rolls set created_at = created_at - interval '1 day' where player_id = a;
  assert (select used from roll_status(a)) = 0, 'new day starts at zero';

  r1 := (select id from rolls where player_id = a and formula = 'hot' order by id limit 1);
  r2 := (select id from rolls where player_id = a and formula = 'hot' order by id desc limit 1);
  perform save_pick(a, r1);
  perform save_pick(a, r2);
  assert (select count(*) from picks where player_id = a) = 1, 'second pick must update, not insert';
  assert (select roll_id from picks where player_id = a) = r2, 'pick must point at latest roll';

  rb := (select id from create_roll_batch(b, '2026-10-01', '{"hot":{}}') limit 1);
  perform pg_temp.expect_error(format('select save_pick(%s, %s)', a, rb), 'roll_not_found');

  -- an earlier unresulted draw already past 14:00 blocks everything
  insert into draws (draw_date, status) values ('2026-09-23', 'scheduled');
  update settings set rolls_per_day = null;
  perform pg_temp.expect_error(format('select create_roll_batch(%s, %L, %L)', b, '2026-10-01', '{}'), 'draw_closed');
  perform pg_temp.expect_error(format('select create_roll_batch(%s, %L, %L)', b, '2026-09-23', '{}'), 'draw_closed');
  perform pg_temp.expect_error(format('select save_pick(%s, %s)', a, r2), 'draw_closed');
  raise notice 'integrity: all checks passed';
end $$;

rollback;
