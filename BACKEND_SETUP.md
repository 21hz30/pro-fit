> 当前开发版本默认使用纯本地模式，请先阅读 [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md)。以下为旧版 Supabase 接入说明；本轮未创建或修改云数据库，新版恢复字段尚未接入远程。

# Pro-fit backend integration setup

This frontend talks directly to the existing Supabase project through `@supabase/supabase-js`. It does not require or include an Express/NestJS server, a service-role key, or a database migration.

## 1. Local environment

Copy `.env.example` to `.env.local` and fill in the active **publishable** key from Supabase Dashboard → Project Settings → API Keys:

```dotenv
VITE_SUPABASE_URL=https://ywinddvwzrewzfnlmrqf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
VITE_APP_URL=http://localhost:5173
```

Restart Vite after changing any environment variable. `.env.local` is ignored by Git. The application deliberately renders a configuration error when either required Supabase value is absent.

Never place a secret key, legacy `service_role` key, database password, or `DATABASE_URL` in a `VITE_` variable. Vite sends every `VITE_` value to the browser.

## 2. Create a trainee account

Use the application's **Initialize Profile** form or Supabase Dashboard → Authentication → Users. A normal sign-up creates a `public.profiles` row through the existing `on_auth_user_created` trigger and always starts with:

- `role = trainee`
- `status = active`

If email confirmation is enabled, confirm the message before signing in. Client-supplied `user_metadata` is used only for `display_name`; it never grants a role.

## 3. Promote a trusted coach

There is intentionally no browser control for role promotion. After the user exists, a trusted project administrator can use the Dashboard SQL Editor with the user's real Auth UUID:

```sql
begin;

update public.profiles
set role = 'coach'
where id = '<coach-auth-user-uuid>'
  and status = 'active';

commit;
```

Verify that exactly one intended row changed before committing. Do not run this SQL with a UUID copied from client input or expose it as a public RPC.

## 4. Create a coach-trainee relationship

After both profiles exist and their roles are correct, a trusted administrator can create the relationship:

```sql
insert into public.coach_trainees (
  coach_id,
  trainee_id,
  status,
  is_primary
)
values (
  '<coach-auth-user-uuid>',
  '<trainee-auth-user-uuid>',
  'active',
  true
);
```

This administrative step must not be moved into browser JavaScript. Existing RLS uses this relationship to scope roster, plans, submitted check-ins, feedback, profiles, and private Storage reads.

## 5. Auth URL configuration

In Supabase Dashboard → Authentication → URL Configuration set:

- Site URL for local testing: `http://localhost:5173`
- Additional redirect URL: `http://localhost:5173/#/update-password`
- Production Site URL: the exact deployed Vercel origin, such as `https://your-project.vercel.app`
- Production redirect URL: `https://your-project.vercel.app/#/update-password`

Use the real production origin, including the correct protocol and custom domain. Password recovery calls `resetPasswordForEmail` with `${window.location.origin}/#/update-password` and waits for the `PASSWORD_RECOVERY` Auth event before `updateUser` changes the password.

## 6. Safe local verification

Install and run:

```bash
npm install
npm test
npm run build
npm run dev
```

The repository tests use an in-memory Supabase-shaped mock and do not contain accounts, passwords, access tokens, or secret keys. To exercise the full two-role flow, create temporary trainee and coach accounts using unique test emails, create their relationship through the trusted Dashboard path, complete the flow, and then remove those temporary users and rows through an administrator channel.

Do not paste passwords, access tokens, refresh tokens, or secret/service-role keys into source files, test fixtures, browser console output, screenshots, commits, or issue trackers.

## 7. Real two-role test sequence

1. Sign in as the coach and confirm only active related trainees appear.
2. Create and publish a workout plan and a diet plan for one related trainee.
3. Sign in as that trainee and confirm draft plans are absent but published plans appear.
4. Save a workout result and meal log, upload a valid image, and submit today's check-in.
5. Confirm the submitted screen is read-only.
6. Sign in as the coach, open the submitted check-in, view the authenticated meal image, and submit feedback.
7. Sign back in as the trainee and confirm the feedback and `reviewed` state appear.
8. Repeat a read attempt with an unrelated account and confirm no relationship-scoped rows or private images are returned.

The current project did not contain permanent Auth users when this integration was built, so this real two-role sequence requires user-provided temporary accounts before it can be claimed as passed.

