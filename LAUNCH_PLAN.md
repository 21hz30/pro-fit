# Pro-fit: first live pilot

Pro-fit helps students fit movement, food, sleep, and recovery around school. Michael's experience as a high school basketball player is the starting point. The product's value should be evaluated through actual student feedback and sustainable habits, not fabricated performance or adoption claims.

## Current delivery

The English product includes Michael's story, coach and coachee workspaces, weekly workout plans, meal ideas and logging, recovery check-ins, coach feedback, daily time/energy priorities, and a 14-day activity view. Local sample accounts illustrate four student scenarios. Sample history is fictional and labeled; it is not evidence of outcomes or Michael's personal training history.

The sample-data upgrade runs once. It adds missing records without overwriting saved plans, check-ins, custom notes, or accounts. Today's Michael check-in remains available for testing. New coachees have no seeded personal history. Existing local registration still joins the internal roster, so this mode is for local development, not real private accounts.

## Actual launch blockers

**This repository has local and Supabase modes; production deployment and cloud readiness have not been verified in this review.** Local mode stores data in a single browser. A public production build using local storage is blocked at startup; localhost builds and local development remain available.

The repository already contains Supabase migrations and service adapters for the earlier training/meal/check-in flow. Merely setting `VITE_DATA_MODE=supabase` does not deliver feature parity:

- Recovery/wellness and daily priorities currently use local operations. Weekly plans and submitted history now have remote adapters. Implement the missing recovery/priority schema, constrained writes and remote adapters before launching those features.
- Remote signup currently creates a coachee. Add a coach application/approval flow and explicit coach–student matching, without invitation codes or automatic access to every student's records. Test access with at least two unrelated coaches and students.
- Configure and verify confirmation and password-reset email, production redirect URLs, and private photo storage on the actual project.
- Publish project-specific privacy and support information, and define account/data deletion, data retention, and the appropriate consent process for the pilot's age group.
- Exercise registration → coach assignment → plan publication → daily check-in → coach review from separate browsers. Verify unassigned users cannot read records or photos, submitted records cannot be changed, and future activity cannot be submitted. Existing SQL policies need those checks against the real backend.

## Recommended first release

Start with Michael, one responsible coach, and a small group of willing teammates. This is a recommendation; the launch audience has not yet been confirmed. Use real, empty accounts in a separate cloud project. Keep the fictional sample workspace out of that database.

Prepare the frontend host with:

```text
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
VITE_APP_URL=https://YOUR_DOMAIN
```

Never place service-role credentials in frontend environment variables. Apply reviewed migrations to staging before production. Build with `npm run build`; serve `dist` over HTTPS. Test the resulting deployment with real email delivery, authentication, database access, and photo uploads before inviting students. The runtime configuration guard checks configuration, not backend readiness.

The owner must provide/select the Supabase project, hosting destination/domain, pilot audience, and support contact before this can become a live service. This repair did not create a cloud project, deploy a hosted build, run the cloud seed, or send invitations.

## Learning from the pilot

Ask whether students can identify a realistic time budget, log a rest day without feeling penalized, find coach feedback, and keep a routine during a busy school week. Collect feedback with consent; record the actual date, problem, product change, and what happened afterward. This gives Michael an honest record of initiative, service, iteration, and learning for university applications. Do not present sample data as impact evidence.

## Verification

Run `npm test` and `npm run build`. Domain tests cover conservative planning, saved priorities, access restrictions, additive sample migration, and the public local-mode guard, alongside existing workflow tests. Browser QA should cover English copy, desktop/mobile layout, registration, role routing, reload persistence, rest/pain planning, history navigation, and coach review. Passing local tests does not verify a cloud deployment.
