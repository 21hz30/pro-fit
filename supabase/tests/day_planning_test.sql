-- Run after the core migrations and enable_daily_planning migration.
-- All test data is rolled back.
begin;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('20000000-0000-0000-0000-000000000001', 'day-plan-owner@example.invalid', '{"display_name":"Planning owner"}'),
  ('20000000-0000-0000-0000-000000000002', 'day-plan-other@example.invalid', '{"display_name":"Other coachee"}'),
  ('20000000-0000-0000-0000-000000000003', 'day-plan-coach@example.invalid', '{"display_name":"Planning coach"}');
update public.profiles set role = 'coach' where id = '20000000-0000-0000-0000-000000000003';
insert into public.coach_trainees (coach_id, trainee_id)
values ('20000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001');

insert into public.daily_checkins (trainee_id, checkin_date, status)
values
  ('20000000-0000-0000-0000-000000000001', current_date, 'draft'),
  ('20000000-0000-0000-0000-000000000001', current_date - 1, 'draft'),
  ('20000000-0000-0000-0000-000000000001', current_date - 2, 'submitted');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
insert into public.day_plans (trainee_id, plan_date, available_minutes, school_load, energy)
values ('20000000-0000-0000-0000-000000000001', current_date, 30, 'normal', 'ready');
insert into public.day_plans (trainee_id, plan_date, available_minutes, school_load, energy)
values ('20000000-0000-0000-0000-000000000001', current_date, 20, 'heavy', 'tired')
on conflict (trainee_id, plan_date) do update set
  trainee_id = excluded.trainee_id, plan_date = excluded.plan_date,
  available_minutes = excluded.available_minutes, school_load = excluded.school_load, energy = excluded.energy;

do $test$
begin
  if (select count(*) from public.day_plans where available_minutes = 20 and school_load = 'heavy' and energy = 'tired') <> 1 then
    raise exception 'FAIL: priorities did not persist as one account/date record';
  end if;
  begin
    update public.day_plans set plan_date = current_date - 1;
    raise exception 'FAIL: priorities moved to another date';
  exception when check_violation then null;
  end;
  begin
    update public.day_plans set available_minutes = 181;
    raise exception 'FAIL: invalid duration was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.day_plans set created_at = now();
    raise exception 'FAIL: account changed audit metadata';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.day_plans (trainee_id, plan_date, available_minutes, school_load, energy)
    values ('20000000-0000-0000-0000-000000000001', current_date - 2, 20, 'normal', 'ready');
    raise exception 'FAIL: submitted date accepted new priorities';
  exception when check_violation or insufficient_privilege then null;
  end;
  begin
    delete from public.day_plans;
    raise exception 'FAIL: authenticated account deleted priorities';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
do $test$
declare changed integer;
begin
  if (select count(*) from public.day_plans) <> 0 then raise exception 'FAIL: unrelated coachee read priorities'; end if;
  update public.day_plans set available_minutes = 10;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'FAIL: unrelated coachee changed priorities'; end if;
  begin
    insert into public.day_plans (trainee_id, plan_date, available_minutes, school_load, energy)
    values ('20000000-0000-0000-0000-000000000001', current_date - 1, 20, 'normal', 'ready');
    raise exception 'FAIL: unrelated coachee inserted priorities for the owner';
  exception when check_violation or insufficient_privilege then null;
  end;
end;
$test$;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
do $test$
begin
  if (select count(*) from public.day_plans) <> 0 then raise exception 'FAIL: coach read private daily priorities'; end if;
end;
$test$;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
update public.daily_checkins set status = 'submitted' where checkin_date = current_date;
do $test$
begin
  begin
    update public.day_plans set available_minutes = 15;
    raise exception 'FAIL: submitted priorities were changed';
  exception when check_violation or insufficient_privilege then null;
  end;
  if (select available_minutes from public.day_plans) <> 20 then raise exception 'FAIL: rejected writes changed saved data'; end if;
end;
$test$;

reset role;
update public.profiles set status = 'disabled' where id = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
do $test$
begin
  if (select count(*) from public.day_plans) <> 0 then raise exception 'FAIL: disabled account read daily priorities'; end if;
end;
$test$;

set local role anon;
do $test$
begin
  begin
    perform 1 from public.day_plans;
    raise exception 'FAIL: anonymous client accessed daily priorities';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

rollback;
select 'PASS: daily planning persistence, validation, account isolation, and read-only rules' as result;
