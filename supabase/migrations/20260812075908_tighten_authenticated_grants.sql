-- Supabase's project defaults may already grant table-level privileges to
-- authenticated. Reset them before applying the intended least-privilege grants.

revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_path) on public.profiles to authenticated;
grant select on public.coach_trainees to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.workout_plans to authenticated;
grant select, insert, update, delete on public.workout_days to authenticated;
grant select, insert, update, delete on public.workout_items to authenticated;
grant select, insert, update, delete on public.diet_plans to authenticated;
grant select, insert, update, delete on public.diet_meals to authenticated;
grant select, insert, update, delete on public.daily_checkins to authenticated;
grant select, insert, update, delete on public.workout_checkins to authenticated;
grant select, insert, update, delete on public.diet_logs to authenticated;
grant select, insert, update, delete on public.coach_feedback to authenticated;
grant usage, select on all sequences in schema public to authenticated;
