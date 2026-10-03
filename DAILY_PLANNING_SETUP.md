# Enable My Day in Supabase

My Day used to render only for browser-local accounts. Cloud accounts also require the `public.day_plans` table. On 2026-10-03, a read-only check of the configured Supabase project confirmed that this table and the optional `daily_checkins.wellness` column were absent. This is a workspace configuration gap, not a problem with Michael's account.

The frontend now loads and saves daily priorities through the same service in local and Supabase modes. Missing planning schema shows a static notice and an action to open Today's Training. It does not prevent training, meal logging, history, or feedback from loading.

## Database step

Apply [20261003090000_enable_daily_planning.sql](supabase/migrations/20261003090000_enable_daily_planning.sql) to the intended project through the normal migration workflow or its SQL editor. The two core MVP migrations must already be present. This migration can run independently of the earlier optional recovery migration. It adds no sample history, account, or training record.

It creates the planning table and policies. Only an active coachee can read and save their own priorities. Saves require a draft check-in; the database locks that check-in while saving to prevent writes racing with submission. Priorities cannot be moved to another account or date, changed after submission, or deleted through the authenticated API.

## Check the result

1. Sign in as Michael and skip the guide. Open My Day; the time, workload, and energy controls should appear.
2. Save chosen priorities for an unsubmitted date and reload. The saved selections should return.
3. A submitted date must stay read-only. An unrelated coachee must not see Michael's priorities.

The existing recovery form and sleep metrics still need their separate remote adapter and schema rollout. This My Day repair does not enable recovery logging or supply missing sleep data.

Frontend tests and database tests do not prove that a migration was applied to a remote project. Keep the deployment status explicit when reporting this change.
