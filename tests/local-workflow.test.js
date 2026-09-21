import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalClient, LOCAL_DATA_KEY, DEMO_PASSWORD, LOCAL_DEMO_TRAINEE_ID } from '../src/local/client.js';
import { createBasketballWeek, recoveryAdvice, validateWellness } from '../src/domain/training.js';
import { migrateEnglishDefaults } from '../src/local/englishMigration.js';
import { signIn, signOut, signUpTrainee } from '../src/services/authService.js';
import { getCoachRoster } from '../src/services/profileService.js';
import { getTraineeWorkout, saveWorkoutPlan } from '../src/services/workoutService.js';
import { getDailyCheckin, getCoachSummary, saveWorkoutCheckin, submitDailyCheckin, submitCoachFeedback, saveDietLog } from '../src/services/checkinService.js';
import { getTraineeDiet, saveDietPlan } from '../src/services/dietService.js';

const date = '2026-09-16';
function memoryStorage() {
  const entries = new Map();
  return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: (key) => entries.delete(key) };
}
const wellness = { sleepHours: 8, fatigue: 2, sorenessArea: '大腿', sorenessLevel: 2, painLevel: 0, painArea: '', feeling: '训练动作稳定，今天没有不适。', zone2Minutes: 45, zone2Rpe: 3 };
const DEMO_EMAILS = { coach: 'demo-coach@pro-fit.app', coachee: 'demo-athlete@pro-fit.app' };
async function login(client, role) { return signIn(client, { email: DEMO_EMAILS[role], password: DEMO_PASSWORD }); }

test('template has seven 45-minute aerobic targets, three separated splits and exactly two basketball classes', () => {
  const plan = createBasketballWeek(date, 't');
  assert.equal(plan.startDate, '2026-09-14'); assert.equal(plan.endDate, '2026-09-20'); assert.equal(plan.days.length, 7);
  assert.deepEqual(plan.days.filter((day) => day.items.some((item) => item.trainingKind === 'strength')).map((day) => day.scheduledDate), ['2026-09-14', '2026-09-16', '2026-09-18']);
  assert.deepEqual(plan.days.filter((day) => day.items.some((item) => item.trainingKind === 'basketball')).map((day) => day.scheduledDate), ['2026-09-15', '2026-09-19']);
  for (const day of plan.days) assert.equal(day.items.filter((item) => item.trainingKind === 'zone2' && Number(item.durationSeconds) === 2700).length, 1);
});

test('wellness validation distinguishes incomplete, pain and fatigue states; a rest day is valid', () => {
  assert.throws(() => validateWellness({ ...wellness, fatigue: '' }), /Complete all recovery/);
  assert.throws(() => validateWellness({ ...wellness, painLevel: 2, painArea: '' }), /area of pain/);
  assert.throws(() => validateWellness({ ...wellness, sleepHours: -1 }), /allowed ranges/);
  assert.equal(recoveryAdvice({ ...wellness, painLevel: 1 }).tone, 'pain');
  assert.equal(recoveryAdvice({ ...wellness, fatigue: 4 }).tone, 'reduce');
  assert.equal(recoveryAdvice({ ...wellness, sleepHours: 6 }).tone, 'reduce');
  assert.equal(recoveryAdvice({ ...wellness, zone2Rpe: 7 }).tone, 'reduce');
  assert.equal(validateWellness({ ...wellness, zone2Minutes: 0, zone2Rpe: 0 }).zone2Minutes, 0);
});

test('two roles register without an invitation; sessions persist and local passwords are not stored in plaintext', async () => {
  const storage = memoryStorage(); const client = createLocalClient(storage, { today: date, seedSamples: false });
  await signUpTrainee(client, { email: 'coach2@example.com', password: 'OnlyLocalPass8', displayName: 'New Coach', role: 'coach' });
  assert.equal((await getCoachRoster(client)).length, 1);
  await signOut(client);
  await signUpTrainee(client, { email: 'new@example.com', password: 'OnlyLocalPass8', displayName: 'New Coachee', role: 'trainee' });
  assert.equal((await client.operations.getCurrentProfile()).role, 'trainee');
  const reloaded = createLocalClient(storage, { today: date, seedSamples: false });
  assert.equal((await reloaded.auth.getSession()).data.session.user.email, 'new@example.com');
  assert.equal(storage.getItem(LOCAL_DATA_KEY).includes('OnlyLocalPass8'), false);
  await assert.rejects(() => signIn(client, { email: 'new@example.com', password: 'wrong' }), /password/);
  await assert.rejects(() => signUpTrainee(client, { email: 'NEW@example.com', password: 'OnlyLocalPass8', displayName: 'Again' }), /already registered/);
  await login(client, 'coach'); assert.equal((await getCoachRoster(client)).length, 2);
});

test('coach publishes workout and diet, coachee saves recovery/logs, coach reviews, and reload preserves feedback', async () => {
  const storage = memoryStorage(); const client = createLocalClient(storage, { today: date, seedSamples: false });
  await login(client, 'coach');
  const dietInput = { traineeId: LOCAL_DEMO_TRAINEE_ID, scheduledDate: date, targetCalories: '2400', targetProteinG: '110', targetCarbsG: '300', targetFatG: '70', coachNotes: '规律饮食', meals: [{ mealType: 'breakfast', mealName: '燕麦与鸡蛋', mealDetails: '按饥饿程度调整' }] };
  const { dietPlanId } = await saveDietPlan(client, dietInput);
  await login(client, 'coachee'); assert.equal((await getTraineeDiet(client, date)).plan, null);
  await login(client, 'coach'); await saveDietPlan(client, { ...dietInput, dietPlanId }, { publish: true });
  const nextPlan = createBasketballWeek('2026-09-21', LOCAL_DEMO_TRAINEE_ID);
  const { workoutPlanId } = await saveWorkoutPlan(client, nextPlan);
  await login(client, 'coachee'); assert.equal((await getTraineeWorkout(client, '2026-09-21')).days.length, 0);
  await login(client, 'coach'); await saveWorkoutPlan(client, { ...nextPlan, workoutPlanId }, { publish: true });
  await login(client, 'coachee'); assert.equal((await getTraineeWorkout(client, '2026-09-21')).days.length, 1);
  await assert.rejects(() => client.operations.saveWellness('2026-09-21', wellness), /Future dates/);
  const workout = await getTraineeWorkout(client, date); assert.equal(workout.days[0].title, 'Legs & Core · Stability');
  await assert.rejects(() => submitDailyCheckin(client, date), /Complete all recovery/);
  await client.operations.saveWellness(date, wellness);
  await saveWorkoutCheckin(client, date, { workoutDayId: workout.days[0].workout_day_id, status: 'completed', actualDurationMinutes: '85', traineeNotes: '保持动作质量' });
  const diet = await getTraineeDiet(client, date);
  await saveDietLog(client, date, { mealType: 'breakfast', dietMealId: diet.meals[0].diet_meal_id, actualFood: '燕麦、鸡蛋与水果', actualCalories: '500' });
  await login(client, 'coach'); assert.equal((await getCoachSummary(client, [LOCAL_DEMO_TRAINEE_ID])).checkins.length, 0);
  await login(client, 'coachee'); const submitted = await submitDailyCheckin(client, date, '明天希望轻松恢复。');
  await assert.rejects(() => client.operations.saveWellness(date, wellness), /read-only/);
  await login(client, 'coach'); const summary = await getCoachSummary(client, [LOCAL_DEMO_TRAINEE_ID]);
  assert.equal(summary.checkins[0].wellness.sleepHours, 8); assert.equal(summary.workoutLogs.length, 1); assert.equal(summary.dietLogs.length, 1);
  await submitCoachFeedback(client, submitted.daily_checkin_id, '明天保持轻松有氧，腿部如果仍酸痛可减至 20 分钟。');
  await login(client, 'coachee'); const reloaded = createLocalClient(storage, { today: date, seedSamples: false });
  const bundle = await getDailyCheckin(reloaded, date);
  assert.equal(bundle.checkin.status, 'reviewed'); assert.equal(bundle.feedback.length, 1); assert.equal(bundle.feedback[0].coach.display_name, 'Coach Ben'); assert.equal(bundle.dietLogs[0].actual_food, '燕麦、鸡蛋与水果');
});

test('overlapping plans and invalid inputs leave local state unchanged; another coachee cannot access private checkins', async () => {
  const storage = memoryStorage(); const client = createLocalClient(storage, { today: date, seedSamples: false });
  await login(client, 'coach'); const before = storage.getItem(LOCAL_DATA_KEY);
  await assert.rejects(() => saveWorkoutPlan(client, createBasketballWeek(date, LOCAL_DEMO_TRAINEE_ID), { publish: true }), /already has/);
  assert.equal(storage.getItem(LOCAL_DATA_KEY), before);
  const invalid = createBasketballWeek('2026-09-21', LOCAL_DEMO_TRAINEE_ID); invalid.days[0].items[0].durationSeconds = '-1';
  await assert.rejects(() => saveWorkoutPlan(client, invalid), /non-negative/);
  assert.equal(storage.getItem(LOCAL_DATA_KEY), before);
  await login(client, 'coachee'); const checkin = await client.operations.saveWellness(date, wellness); await submitDailyCheckin(client, date);
  await signUpTrainee(client, { email: 'private@example.com', password: 'Password10', displayName: 'Other' });
  await assert.rejects(() => client.operations.getCheckinBundle(checkin.daily_checkin_id), /permission/);
  await assert.rejects(() => saveWorkoutPlan(client, createBasketballWeek(date, LOCAL_DEMO_TRAINEE_ID)), /permission/);
});

test('unavailable or corrupt persistence yields a recoverable auth error instead of deleting data', async () => {
  const storage = memoryStorage(); storage.setItem(LOCAL_DATA_KEY, '{broken');
  const client = createLocalClient(storage, { today: date, seedSamples: false });
  assert.match((await client.auth.getSession()).error.message, /Unable to read/);
  assert.equal(storage.getItem(LOCAL_DATA_KEY), '{broken');
});

test('English migration translates saved template content without changing IDs, logs, or custom text', async () => {
  const storage = memoryStorage(); const client = createLocalClient(storage, { today: date, seedSamples: false });
  await login(client, 'coachee');
  await client.operations.saveWellness(date, wellness);
  const state = JSON.parse(storage.getItem(LOCAL_DATA_KEY));
  delete state.contentLocale;
  state.plans[0].plan_name = '\u7bee\u7403\u4f53\u80fd\u57fa\u7840 · 7 \u65e5\u8ba1\u5212';
  state.plans[0].days[0].title = '\u63a8 · \u4e0a\u80a2\u529b\u91cf';
  state.plans[0].goal = 'My custom goal';
  state.workouts.push({ workout_checkin_id: 900, title: '\u63a8 · \u4e0a\u80a2\u529b\u91cf', trainee_notes: 'Keep my notes', status: 'skipped' });
  const originalIds = state.plans[0].days.map((day) => day.workout_day_id);
  storage.setItem(LOCAL_DATA_KEY, JSON.stringify(state));
  const upgraded = createLocalClient(storage, { today: date, seedSamples: false });
  await upgraded.auth.getSession();
  const saved = JSON.parse(storage.getItem(LOCAL_DATA_KEY));
  assert.equal(saved.contentLocale, 'en-US');
  assert.equal(saved.plans[0].plan_name, 'Basketball Foundation · 7-Day Plan');
  assert.equal(saved.plans[0].days[0].title, 'Push · Upper Body');
  assert.equal(saved.plans[0].goal, 'My custom goal');
  assert.deepEqual(saved.plans[0].days.map((day) => day.workout_day_id), originalIds);
  assert.deepEqual(saved.accounts, state.accounts);
  assert.deepEqual(saved.checkins, state.checkins);
  assert.equal(saved.workouts[0].title, 'Push · Upper Body');
  assert.equal(saved.workouts[0].trainee_notes, 'Keep my notes');
  assert.equal(migrateEnglishDefaults(saved), saved);
});

test('legacy demo IDs migrate without losing sessions, password hashes or custom records', async () => {
  const storage = memoryStorage();
  const client = createLocalClient(storage, { today: date, seedSamples: false });
  await login(client, 'coachee');
  await client.operations.saveWellness(date, wellness);
  const saved = JSON.parse(storage.getItem(LOCAL_DATA_KEY));
  saved.plans[0].goal = 'Custom goal remains';
  saved.accounts[0].hash = 'custom-hash';
  const legacy = JSON.stringify(saved).replaceAll('demo-coach@pro-fit.app','coach@profit.local').replaceAll('demo-athlete@pro-fit.app','coachee@profit.local').replaceAll('demo-coach','local-ben').replaceAll('demo-athlete','local-michael');
  storage.setItem(LOCAL_DATA_KEY,legacy);
  storage.setItem('pro-fit.session.v1','local-michael');
  const upgraded = createLocalClient(storage,{today:date,seedSamples:false});
  assert.equal((await upgraded.auth.getSession()).data.session.user.id, LOCAL_DEMO_TRAINEE_ID);
  assert.equal((await getTraineeWorkout(upgraded,date)).days.length,1);
  const next = JSON.parse(storage.getItem(LOCAL_DATA_KEY));
  assert.equal(next.accounts[0].hash,'custom-hash');
  assert.equal(next.plans[0].goal,'Custom goal remains');
  assert.deepEqual(next.checkins[0].wellness,wellness);
  const before = storage.getItem(LOCAL_DATA_KEY);
  await createLocalClient(storage,{today:date,seedSamples:false}).auth.getSession();
  assert.equal(storage.getItem(LOCAL_DATA_KEY),before);
});

test('fresh sample users see current workouts, named weekly plans, and plan history', async () => {
  const client = createLocalClient(memoryStorage(), {today:date});
  await login(client,'coachee');
  assert.equal((await getTraineeWorkout(client,date)).days.length,1);
  assert.equal((await client.operations.getTraineeWeek('2026-09-14','2026-09-20')).length,7);
  assert.ok((await client.operations.getTraineeWeek('2026-09-14','2026-09-20'))[0].plan.plan_name);
  assert.equal((await client.operations.getTraineeAllPlans()).length,3);
});
