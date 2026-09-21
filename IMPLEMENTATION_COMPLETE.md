# Implementation status — 2026-09-20

The earlier completion checklist overstated cloud feature parity. README.md and LAUNCH_PLAN.md now define the delivery boundary.

- Local demo identities use demo-coach / demo-athlete. Existing legacy identities, references, passwords and sessions migrate without clearing browser data.
- Athlete routes include Today, Weekly Plan, Training History, and My Day. Week/history routes survive reload; recovery forms are restored locally.
- Draft save, publication, historical plans, and coach schedules work through the mode-specific adapters. Remote publication occurs only after child writes succeed; a failed save remains a draft. Multi-request draft edits are not database transactions.
- Weekly coach metrics join logs to check-in dates, compute response time from timestamps, count latest recent recovery per athlete, and exclude missing nutrition from averages. Unknown data is shown as —.
- Pages load on demand to reduce the initial bundle.
- Cloud demo scripts now live in supabase/demo. The seed uses the existing schema, creates 35 diet plans / 140 meals, and refuses nonempty demo workspaces. Historical scripts are inert text under archive.
- Recovery and daily-priority persistence in Supabase, production RLS acceptance, actual email delivery and deployment remain unverified rollout work. Demo seed execution is separate from frontend tests.
