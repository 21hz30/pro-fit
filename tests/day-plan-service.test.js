import assert from 'node:assert/strict';
import test from 'node:test';
import { getDayPlan, saveDayPlan } from '../src/services/dayPlanService.js';
import { createMockClient, queryResult } from './helpers/mockSupabase.js';

const date = '2026-09-20';
const plan = { availableMinutes: 20, schoolLoad: 'heavy', energy: 'ready' };
const stored = { available_minutes: 20, school_load: 'heavy', energy: 'ready' };

test('cloud priorities are scoped to the signed-in account and normalize saved data', async () => {
  const calls = [];
  const client = createMockClient({ user: { id: 'michael' } });
  client.from = (table) => { assert.equal(table, 'day_plans'); return queryResult({ data: stored }, calls); };
  assert.deepEqual(await getDayPlan(client, date), plan);
  assert.ok(calls.some(([name, args]) => name === 'eq' && args[0] === 'trainee_id' && args[1] === 'michael'));
  assert.ok(calls.some(([name, args]) => name === 'eq' && args[0] === 'plan_date' && args[1] === date));
});

test('missing planning schema has a distinct unavailable state; other errors remain errors', async () => {
  for (const [code, expected] of [['PGRST205', 'DAY_PLANNING_UNAVAILABLE'], ['42P01', 'DAY_PLANNING_UNAVAILABLE'], ['42501', '42501']]) {
    const client = createMockClient({ tables: { day_plans: { error: { code, message: 'Database error' } } } });
    await assert.rejects(() => getDayPlan(client, date), (error) => error.code === expected);
  }
  assert.equal(await getDayPlan(createMockClient({ tables: { day_plans: { data: null } } }), date), null);
});

test('invalid values and future dates do not create a check-in or save priorities', async () => {
  const client = createMockClient();
  await assert.rejects(() => saveDayPlan(client, '2026-02-30', plan), /valid date/);
  await assert.rejects(() => saveDayPlan(client, date, { ...plan, availableMinutes: 181 }), /minutes/);
  await assert.rejects(() => saveDayPlan(client, '2999-01-01', plan), /Future dates/);
  assert.deepEqual(client.tableCalls, []);
});

test('submitted check-ins block priority writes and drafts save with an account/date conflict key', async () => {
  const submitted = createMockClient({ tables: { daily_checkins: { data: { daily_checkin_id: 1, status: 'submitted' } } } });
  await assert.rejects(() => saveDayPlan(submitted, date, plan), /read-only/);
  assert.deepEqual(submitted.tableCalls, ['daily_checkins']);

  const calls = [];
  const draft = createMockClient({ tables: { daily_checkins: { data: { daily_checkin_id: 1, status: 'draft' } } } });
  const originalFrom = draft.from;
  draft.from = (table) => table === 'day_plans' ? queryResult({ data: stored }, calls) : originalFrom(table);
  assert.deepEqual(await saveDayPlan(draft, date, plan), plan);
  assert.deepEqual(calls.find(([name]) => name === 'upsert')[1], [{ trainee_id: 'user-1', plan_date: date, ...stored }, { onConflict: 'trainee_id,plan_date' }]);
});

test('the common planning service preserves the local storage adapter', async () => {
  const client = { isLocal: true, operations: {
    getDayPlan: async (value) => { assert.equal(value, date); return plan; },
    saveDayPlan: async (value, input) => { assert.equal(value, date); return input; },
  } };
  assert.deepEqual(await getDayPlan(client, date), plan);
  assert.deepEqual(await saveDayPlan(client, date, plan), plan);
});
