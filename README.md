# Pro-fit

Student basketball training workspace built with React + Vite. Coaches assign training and meal plans; athletes log workouts and meals and receive coach feedback.

Repository: https://github.com/21hz30/pro-fit · current branch: `master`.

## Run

```sh
npm install
VITE_DATA_MODE=local npm run dev
npm test
npm run build
```

Use the explicit local-mode override to test without contacting Supabase. A private `.env` may select Supabase; `.env.example` defaults to local mode. Local demo credentials and storage behavior are in [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md).

## Supported modes

| Capability | Local sample workspace | Supabase core workspace |
| --- | --- | --- |
| Training plans, weekly view, history | Supported | Supported by service adapters |
| Save draft and publish | Supported | Draft children save before publication |
| Workout/meal logs and feedback | Supported | Supported by service adapters |
| Recovery form, My Day priorities | Browser persistence | Not yet persisted remotely |
| Coach metrics | Recorded data, unknown values shown as — | Core metrics; wellness unavailable |
| Account assignment | Internal demo roster | Administrative assignment required |

Cloud schema and policy changes must be verified separately before a live pilot; see [LAUNCH_PLAN.md](LAUNCH_PLAN.md). Local tests do not verify a deployed database.

## Demo data

Use [supabase/demo/README.md](supabase/demo/README.md) for the single supported cloud demo setup. Earlier scripts are preserved as inert text in `supabase/demo/archive`. Never import fictional history into a real student workspace.

## Git

`git log --oneline` lists commits. A single push can transfer many commits. `git remote -v` shows the configured GitHub destination. `push.sh` uses `origin` and the current branch with normal Git authentication; it stores no token. An older local script contained a token: removing the file content does not revoke that credential; revoke it in GitHub settings.
