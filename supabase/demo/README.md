# Supabase demo workspace

Use an isolated Supabase project containing no real student data. The seed matches the two checked-in migrations; it does not invent recovery columns or collect real wellness history.

1. Apply the migrations with the normal Supabase migration workflow.
2. Set server-side `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PRO_FIT_DEMO_PASSWORD`, then run `node scripts/setup-demo-accounts.js`. Never use a VITE-prefixed variable for the service role key. The login buttons use the public sample password documented in LOCAL_DEVELOPMENT.md; these are demo-only accounts.
3. Run `seed.sql` once in the SQL editor. It creates 5 weeks, 35 training days, past check-ins and feedback, and 35 diet plans with 140 meals. It aborts atomically if these demo users already have business data; it never deletes records.
4. Run `check.sql` to inspect the result. Refresh the app in Supabase mode.

`archive/` keeps the previous experiments as inert `.txt` files. Do not run those scripts. This repository update does not execute the seed or change any cloud account. Cloud recovery and daily-priority persistence remain separate rollout work described in LAUNCH_PLAN.md.
