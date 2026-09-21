import test from 'node:test';
import assert from 'node:assert/strict';
import { signIn, signUpTrainee } from '../src/services/authService.js';
import { getCoachRoster } from '../src/services/profileService.js';
import { getTraineeWorkout } from '../src/services/workoutService.js';
import { getTraineeDiet } from '../src/services/dietService.js';
import { getCoachCheckins } from '../src/services/checkinService.js';
import { validateMealPhoto } from '../src/services/storageService.js';
import { createMockClient } from './helpers/mockSupabase.js';

test('auth service returns session data and never infers a role from login input', async () => {
  const calls = [];
  const client = createMockClient({ auth: { signInWithPassword: async (payload) => { calls.push(payload); return { data: { user: { id: 'u1' }, session: { access_token: 'not-logged' } }, error: null }; } } });
  const data = await signIn(client, { email: ' USER@example.com ', password: 'password1' });
  assert.equal(data.user.id, 'u1');
  assert.deepEqual(calls[0], { email: 'USER@example.com', password: 'password1' });
  assert.equal('role' in calls[0], false);
});

test('registration sends display_name only as presentation metadata', async () => {
  let payload;
  const client = createMockClient({ auth: { signUp: async (next) => { payload = next; return { data: { user: { id: 'u1' }, session: null }, error: null }; } } });
  const result = await signUpTrainee(client, { email: 'a@example.com', password: 'password1', displayName: ' Alice ' });
  assert.deepEqual(payload.options.data, { display_name: 'Alice' });
  assert.equal(result.needsEmailConfirmation, true);
});

test('Supabase errors are surfaced by service methods', async () => {
  const client = createMockClient({ auth: { signInWithPassword: async () => ({ data: null, error: { message: 'Invalid login', code: 'invalid_credentials' } }) } });
  await assert.rejects(() => signIn(client, { email: 'a@example.com', password: 'bad-password' }), (error) => error.message === 'Invalid login' && error.code === 'invalid_credentials');
});

test('coach roster maps active related profiles and supports an empty result', async () => {
  const client = createMockClient({ user: { id: 'coach-1' }, tables: { coach_trainees: { data: [{ coach_trainee_id: 2, trainee_id: 't1', is_primary: true, started_at: '2026-01-01', trainee: { id: 't1', display_name: 'Trainee One', avatar_path: null, status: 'active' } }], error: null } } });
  const roster = await getCoachRoster(client);
  assert.equal(roster[0].display_name, 'Trainee One');
  const emptyClient = createMockClient({ tables: { coach_trainees: { data: [], error: null } } });
  assert.deepEqual(await getCoachRoster(emptyClient), []);
});

test('trainee workout service returns explicit empty state without child queries', async () => {
  const client = createMockClient({ tables: { workout_plans: { data: [], error: null } } });
  assert.deepEqual(await getTraineeWorkout(client, '2026-08-17'), { plans: [], days: [] });
  assert.deepEqual(client.tableCalls, ['workout_plans']);
});

test('trainee workout service composes plan, day, item and exercise data', async () => {
  const client = createMockClient({ tables: {
    workout_plans: { data: [{ workout_plan_id: 1, plan_name: 'Plan' }], error: null },
    workout_days: { data: [{ workout_day_id: 2, workout_plan_id: 1, title: 'Day' }], error: null },
    workout_items: { data: [{ workout_item_id: 3, workout_day_id: 2, exercise: { exercise_name: 'Squat' } }], error: null },
  } });
  const result = await getTraineeWorkout(client, '2026-08-17');
  assert.equal(result.days[0].items[0].exercise.exercise_name, 'Squat');
  assert.equal(result.days[0].plan.plan_name, 'Plan');
});

test('diet and coach check-in services handle empty data', async () => {
  const client = createMockClient({ tables: { diet_plans: { data: null, error: null } } });
  assert.deepEqual(await getTraineeDiet(client, '2026-08-17'), { plan: null, meals: [] });
  assert.deepEqual(await getCoachCheckins(client, []), []);
});

test('meal photo validation rejects unsafe type and oversized files', () => {
  assert.throws(() => validateMealPhoto({ type: 'application/pdf', size: 100 }), /JPG/);
  assert.throws(() => validateMealPhoto({ type: 'image/png', size: 9 * 1024 * 1024 }), /8 MB/);
  assert.doesNotThrow(() => validateMealPhoto({ type: 'image/webp', size: 1024 }));
});


test('cloud plan publishes only after all children save; a failed save stays draft', async () => {
  const { saveWorkoutPlan } = await import('../src/services/workoutService.js');
  const { createBasketballWeek } = await import('../src/domain/training.js');
  for (const failItems of [false,true]) {
    const events = [];
    const client = {
      auth: {getUser: async () => ({data:{user:{id:'coach'}}})},
      from(table) {
        let action = 'select'; let payload;
        const query = new Proxy({}, {get(_target,property) {
          if (property === 'then') {
            events.push({table,action,payload});
            let result = {data: table === 'workout_plans' ? {workout_plan_id:42,status:'draft'} : table === 'workout_days' ? {workout_day_id:43} : []};
            if (table === 'workout_items' && failItems) result = {error:{message:'Child write failed'}};
            return Promise.resolve(result).then.bind(Promise.resolve(result));
          }
          return (...args) => { if (['insert','update','delete'].includes(property)) {action=property;payload=args[0];} return query; };
        }});
        return query;
      },
    };
    const input = createBasketballWeek('2026-09-21','trainee');
    input.days = input.days.slice(0,1);
    input.days[0].items = [{exerciseId:1,sets:3,repsMin:8,repsMax:10}];
    if (failItems) await assert.rejects(() => saveWorkoutPlan(client,input,{publish:true}), /Child write failed/);
    else await saveWorkoutPlan(client,input,{publish:true});
    assert.equal(events.find((e) => e.table === 'workout_plans' && e.action === 'insert').payload.status,'draft');
    const publishIndex = events.findIndex((e) => e.table === 'workout_plans' && e.action === 'update' && e.payload.status === 'published');
    if (failItems) assert.equal(publishIndex,-1);
    else assert.ok(publishIndex > events.findIndex((e) => e.table === 'workout_items' && e.action === 'insert'));
  }
});
