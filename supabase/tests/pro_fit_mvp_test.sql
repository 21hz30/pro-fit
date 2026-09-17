-- Re-runnable Pro-fit MVP integration test.
-- All test users and business rows are rolled back before the script returns PASS.

begin;

insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'pro-fit-coach-test@example.invalid',
    '{"display_name":"Test Coach"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'pro-fit-trainee-test@example.invalid',
    '{"display_name":"Test Trainee"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'pro-fit-outsider-test@example.invalid',
    '{"display_name":"Test Outsider"}'::jsonb,
    now(),
    now()
  );

do $test$
begin
  if (
    select count(*)
    from public.profiles
    where id in (
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000003'
    )
      and role = 'trainee'
      and status = 'active'
  ) <> 3 then
    raise exception 'FAIL: auth.users trigger did not create three active trainee profiles';
  end if;
end
$test$;

-- Coach promotion and relationship assignment are trusted administrative actions.
update public.profiles
set role = 'coach'
where id = '10000000-0000-0000-0000-000000000001';

insert into public.coach_trainees (
  coach_trainee_id,
  coach_id,
  trainee_id,
  status,
  is_primary
)
values (
  900001,
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'active',
  true
);

-- Coach creates draft workout and diet plans for the assigned trainee.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.exercises (
  exercise_id,
  exercise_name,
  equipment,
  video_url,
  created_by
)
values (
  900001,
  'Test Squat',
  'Barbell',
  'https://example.invalid/squat',
  '10000000-0000-0000-0000-000000000001'
);

insert into public.workout_plans (
  workout_plan_id,
  coach_id,
  trainee_id,
  plan_name,
  goal,
  start_date,
  end_date
)
values (
  900001,
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'Test Strength Plan',
  'Strength',
  current_date,
  current_date + 7
);

insert into public.workout_days (
  workout_day_id,
  workout_plan_id,
  scheduled_date,
  day_number,
  title,
  estimated_duration_minutes
)
values (
  900001,
  900001,
  current_date,
  1,
  'Test Lower Body',
  45
);

insert into public.workout_items (
  workout_item_id,
  workout_day_id,
  exercise_id,
  sort_order,
  sets,
  reps_min,
  reps_max,
  target_weight,
  weight_unit,
  rest_seconds
)
values (
  900001,
  900001,
  900001,
  1,
  3,
  8,
  10,
  50,
  'kg',
  90
);

insert into public.diet_plans (
  diet_plan_id,
  coach_id,
  trainee_id,
  scheduled_date,
  target_calories,
  target_protein_g,
  target_carbs_g,
  target_fat_g
)
values (
  900001,
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  current_date,
  2200,
  160,
  230,
  70
);

insert into public.diet_meals (
  diet_meal_id,
  diet_plan_id,
  meal_type,
  meal_name,
  meal_details
)
values (
  900001,
  900001,
  'breakfast',
  'Test Breakfast',
  'Oats and eggs'
);

do $test$
begin
  if (select count(*) from public.workout_plans where workout_plan_id = 900001) <> 1
     or (select count(*) from public.diet_plans where diet_plan_id = 900001) <> 1 then
    raise exception 'FAIL: assigned coach cannot see their draft plans';
  end if;
end
$test$;

-- Trainee can see related profiles but cannot see draft plans or change role.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $test$
begin
  if (select count(*) from public.profiles) <> 2 then
    raise exception 'FAIL: trainee should see only self and assigned coach profiles';
  end if;

  if (select count(*) from public.workout_plans where workout_plan_id = 900001) <> 0
     or (select count(*) from public.diet_plans where diet_plan_id = 900001) <> 0 then
    raise exception 'FAIL: trainee can see draft plans';
  end if;

  begin
    update public.profiles
    set role = 'coach'
    where id = '10000000-0000-0000-0000-000000000002';
    raise exception 'FAIL: trainee changed protected role column';
  exception
    when insufficient_privilege then null;
  end;
end
$test$;

-- Coach publishes both plans.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

update public.workout_plans
set status = 'published', published_at = now()
where workout_plan_id = 900001;

update public.diet_plans
set status = 'published', published_at = now()
where diet_plan_id = 900001;

-- Trainee reads the published content, logs execution, uploads private objects, and submits.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $test$
begin
  if (select count(*) from public.workout_plans where workout_plan_id = 900001) <> 1
     or (select count(*) from public.workout_days where workout_day_id = 900001) <> 1
     or (select count(*) from public.workout_items where workout_item_id = 900001) <> 1
     or (select count(*) from public.diet_plans where diet_plan_id = 900001) <> 1
     or (select count(*) from public.diet_meals where diet_meal_id = 900001) <> 1 then
    raise exception 'FAIL: trainee cannot read all published plan content';
  end if;
end
$test$;

insert into public.daily_checkins (
  daily_checkin_id,
  trainee_id,
  checkin_date,
  trainee_notes
)
values (
  900001,
  '10000000-0000-0000-0000-000000000002',
  current_date,
  'Test check-in'
);

insert into public.workout_checkins (
  workout_checkin_id,
  daily_checkin_id,
  workout_day_id,
  status,
  actual_duration_minutes,
  completed_at
)
values (
  900001,
  900001,
  900001,
  'completed',
  43,
  now()
);

insert into public.diet_logs (
  diet_log_id,
  daily_checkin_id,
  diet_meal_id,
  meal_type,
  actual_food,
  actual_calories,
  photo_path
)
values (
  900001,
  900001,
  900001,
  'breakfast',
  'Oats and eggs',
  520,
  '10000000-0000-0000-0000-000000000002/900001/test.webp'
);

insert into storage.objects (bucket_id, name, owner_id)
values
  (
    'meal-photos',
    '10000000-0000-0000-0000-000000000002/900001/test.webp',
    '10000000-0000-0000-0000-000000000002'
  ),
  (
    'avatars',
    '10000000-0000-0000-0000-000000000002/avatar.webp',
    '10000000-0000-0000-0000-000000000002'
  );

update storage.objects
set metadata = '{"test":true}'::jsonb
where bucket_id = 'meal-photos'
  and name = '10000000-0000-0000-0000-000000000002/900001/test.webp';

update public.daily_checkins
set status = 'submitted', submitted_at = now()
where daily_checkin_id = 900001;

-- Assigned coach sees submitted execution and private files, then gives feedback.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $test$
begin
  if (select count(*) from public.daily_checkins where daily_checkin_id = 900001) <> 1
     or (select count(*) from public.workout_checkins where workout_checkin_id = 900001) <> 1
     or (select count(*) from public.diet_logs where diet_log_id = 900001) <> 1 then
    raise exception 'FAIL: assigned coach cannot see submitted execution data';
  end if;

  if (
    select count(*)
    from storage.objects
    where bucket_id in ('meal-photos', 'avatars')
      and owner_id = '10000000-0000-0000-0000-000000000002'
  ) <> 2 then
    raise exception 'FAIL: assigned coach cannot read trainee private files';
  end if;
end
$test$;

insert into public.coach_feedback (
  feedback_id,
  daily_checkin_id,
  coach_id,
  feedback_content
)
values (
  900001,
  900001,
  '10000000-0000-0000-0000-000000000001',
  'Good work'
);

do $test$
begin
  if not exists (
    select 1
    from public.daily_checkins
    where daily_checkin_id = 900001
      and status = 'reviewed'
      and reviewed_at is not null
  ) then
    raise exception 'FAIL: coach feedback did not mark the submitted check-in reviewed';
  end if;
end
$test$;

-- Unrelated authenticated user cannot see or modify the relationship-scoped data.
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $test$
begin
  if (select count(*) from public.profiles) <> 1
     or (select count(*) from public.workout_plans) <> 0
     or (select count(*) from public.diet_plans) <> 0
     or (select count(*) from public.daily_checkins) <> 0
     or (select count(*) from public.coach_feedback) <> 0
     or (select count(*) from storage.objects where bucket_id in ('avatars', 'meal-photos')) <> 0 then
    raise exception 'FAIL: unrelated user can read relationship-scoped data';
  end if;

  begin
    insert into public.workout_plans (
      workout_plan_id,
      coach_id,
      trainee_id,
      plan_name,
      start_date,
      end_date
    )
    values (
      900002,
      '10000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000002',
      'Unauthorized plan',
      current_date,
      current_date
    );
    raise exception 'FAIL: unrelated user created a workout plan for trainee';
  exception
    when insufficient_privilege then null;
  end;
end
$test$;

-- Anonymous role has no business-table privileges.
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

do $test$
begin
  begin
    perform 1 from public.profiles limit 1;
    raise exception 'FAIL: anon can select profiles';
  exception
    when insufficient_privilege then null;
  end;
end
$test$;

reset role;
rollback;

select
  'PASS' as result,
  'Auth trigger, coach/trainee workflow, RLS isolation, role protection, feedback review, and private Storage policies passed; transaction rolled back.' as coverage;
