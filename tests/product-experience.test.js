import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalClient, LOCAL_DATA_KEY, DEMO_PASSWORD } from '../src/local/client.js';
import { suggestDay, validateDayPlan } from '../src/domain/dayPlanner.js';
import { getRuntimeConfigError } from '../src/lib/runtimeConfig.js';

const date = '2026-09-16';
function memoryStorage() { const data = new Map(); return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) }; }
const signIn = (client, role = 'coachee') => client.auth.signInWithPassword({ email: `${role}@profit.local`, password: DEMO_PASSWORD });

test('daily suggestions prioritize pain and recovery, and never exceed available or assigned minutes', () => {
  const day = { availableMinutes: 30, schoolLoad: 'normal', energy: 'ready' };
  assert.equal(suggestDay(day, null, 90).minutes, 30);
  assert.equal(suggestDay(day, null, 15).minutes, 15);
  assert.equal(suggestDay({ ...day, schoolLoad: 'heavy' }, null, 90).minutes, 20);
  assert.equal(suggestDay(day, { sleepHours: 7.5 }, 90).minutes, 20);
  assert.equal(suggestDay(day, { painLevel: 1 }, 90).minutes, 0);
  assert.equal(suggestDay({ ...day, energy: 'pain' }, null, 90).minutes, 0);
  assert.equal(suggestDay({ ...day, schoolLoad: 'heavy', energy: 'tired' }, null, 90).minutes, 0);
  assert.equal(suggestDay({ ...day, availableMinutes: 0 }, null, 90).minutes, 0);
  assert.throws(() => validateDayPlan({ ...day, availableMinutes: -10 }), /minutes/);
  assert.throws(() => validateDayPlan({ ...day, energy: 'unknown' }), /feel/);
});

test('sample upgrade is additive, idempotent and keeps existing personal records intact', async () => {
  const storage = memoryStorage();
  const original = createLocalClient(storage, { today: date, seedSamples: false });
  await signIn(original);
  const state = JSON.parse(storage.getItem(LOCAL_DATA_KEY));
  state.plans[0].goal = 'My own goal';
  state.checkins.push({ daily_checkin_id: ++state.sequence, trainee_id: 'local-michael', checkin_date: '2026-09-15', status: 'draft', trainee_notes: 'Keep this personal note' });
  const oldPlan = structuredClone(state.plans[0]); const oldCheckin = structuredClone(state.checkins[0]);
  storage.setItem(LOCAL_DATA_KEY, JSON.stringify(state));
  const upgraded = createLocalClient(storage, { today: date }); await upgraded.auth.getSession();
  const next = JSON.parse(storage.getItem(LOCAL_DATA_KEY));
  assert.deepEqual(next.plans[0], oldPlan); assert.deepEqual(next.checkins[0], oldCheckin);
  assert.equal(next.profiles.filter((p) => p.role === 'trainee').length, 4);
  assert(next.checkins.length > 40); assert(next.feedback.length > 30);
  assert(!next.checkins.some((c) => c.checkin_date >= date));
  assert(next.diets.filter((d) => d.trainee_id === 'local-michael').length === 7);
  const ids = [...next.plans.map((p) => p.workout_plan_id), ...next.checkins.map((c) => c.daily_checkin_id), ...next.meals.map((m) => m.diet_log_id)];
  assert.equal(new Set(ids).size, ids.length);
  const before = storage.getItem(LOCAL_DATA_KEY);
  const again = createLocalClient(storage, { today: date }); await again.auth.getSession();
  assert.equal(storage.getItem(LOCAL_DATA_KEY), before);
});

test('day priorities persist, are private to each student, and submitted records stay read-only', async () => {
  const storage = memoryStorage(); const client = createLocalClient(storage, { today: date }); await signIn(client);
  const plan = { availableMinutes: 20, schoolLoad: 'heavy', energy: 'ready' };
  await client.operations.saveDayPlan(date, plan);
  const reload = createLocalClient(storage, { today: date }); await reload.auth.getSession();
  assert.equal((await reload.operations.getDayPlan(date)).availableMinutes, 20);
  await assert.rejects(() => client.operations.saveDayPlan('2026-09-15', plan), /read-only/);
  await client.auth.signUp({ email: 'new@example.com', password: 'NewPassword123', options: { data: { display_name: 'New student' } } });
  assert.deepEqual(await client.operations.getActivityHistory('2026-09-01', date), []);
  assert.equal(await client.operations.getDayPlan(date), null);
  await signIn(client, 'coach');
  await assert.rejects(() => client.operations.getActivityHistory('2026-09-01', date), /Coachee/);
});

test('a public production build cannot silently fall back to browser-only accounts', () => {
  const base = { hostname: 'profit.example.com', isDevelopment: false, dataMode: 'local' };
  assert.match(getRuntimeConfigError(base), /cannot accept live accounts/);
  assert.match(getRuntimeConfigError({ ...base, dataMode: undefined }), /cannot accept live accounts/);
  assert.equal(getRuntimeConfigError({ ...base, hostname: '127.0.0.1' }), null);
  assert.equal(getRuntimeConfigError({ ...base, isDevelopment: true }), null);
  assert.match(getRuntimeConfigError({ ...base, dataMode: 'supabase' }), /not configured/);
  assert.match(getRuntimeConfigError({ ...base, dataMode: 'typo' }), /Unknown/);
  assert.equal(getRuntimeConfigError({ ...base, dataMode: 'supabase', supabaseUrl: 'https://example.supabase.co', publishableKey: 'public-key' }), null);
});
