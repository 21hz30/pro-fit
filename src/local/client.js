import { addSampleData } from './sampleData.js';
import { validateDayPlan } from '../domain/dayPlanner.js';
import { migrateEnglishDefaults } from './englishMigration.js';
import { createBasketballWeek, validateWellness } from '../domain/training.js';
import { calculateStreak, getLocalDateString } from '../utils/date.js';
import { validateMealPhoto } from '../services/storageService.js';
import { saveLocalPhoto, deleteLocalPhoto, localPhotoUrl } from './photoStore.js';

export const LOCAL_DATA_KEY = 'pro-fit.local.v1';
export const LOCAL_SESSION_KEY = 'pro-fit.session.v1';
export const DEMO_ACCOUNTS = [
  { id: 'demo-coach', display_name: 'Coach Ben', role: 'coach', email: 'demo-coach@pro-fit.app' },
  { id: 'demo-athlete', display_name: 'Michael', role: 'trainee', email: 'demo-athlete@pro-fit.app' },
];
export const DEMO_PASSWORD = 'ProFit2026!';
const now = () => new Date().toISOString();
const copy = (value) => structuredClone(value);
const number = (value) => value === '' || value == null ? null : Number(value);
const ok = (data) => ({ data, error: null });
const fail = (error) => ({ data: null, error: { message: error.message, code: 'LOCAL_ERROR' } });

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createLocalClient(storage, { today = null, events = null, seedSamples = true } = {}) {
  const listeners = new Set();
  let initializationError;
  const ready = initialize().catch((error) => { initializationError = error; });
  function read() {
    if (initializationError) throw initializationError;
    let state;
    try { state = JSON.parse(storage.getItem(LOCAL_DATA_KEY)); } catch { throw new Error('Unable to read local data. Keep your browser data and contact the project maintainer.'); }
    if (!state || state.version !== 1) throw new Error('This local data version is not supported. Back up your data before continuing.');
    return state;
  }
  function write(state) {
    try { storage.setItem(LOCAL_DATA_KEY, JSON.stringify(state)); } catch { throw new Error('Local data was not saved. Check browser storage permissions and available space.'); }
  }
  function id(state) { return ++state.sequence; }
  function profile(state, target) { return state.profiles.find((row) => row.id === target); }
  function current(state = read()) {
    const user = profile(state, storage.getItem(LOCAL_SESSION_KEY));
    if (!user || user.status !== 'active') throw new Error('Please sign in first.');
    return user;
  }
  function coachFor(state, traineeId) {
    const user = current(state);
    if (user.role !== 'coach' || !state.relationships.some((row) => row.coach_id === user.id && row.trainee_id === traineeId)) throw new Error('You do not have permission to access or edit this coachee data.');
    return user;
  }
  function ownTrainee(state) { const user = current(state); if (user.role !== 'trainee') throw new Error('Please sign in with a Coachee account.'); return user; }
  function visibleCheckin(state, checkinId) {
    const checkin = state.checkins.find((row) => row.daily_checkin_id === checkinId);
    if (!checkin) throw new Error('Check-in not found.');
    if (current(state).id !== checkin.trainee_id) {
      coachFor(state, checkin.trainee_id);
      if (checkin.status === 'draft') throw new Error('This coachee has not submitted the check-in yet.');
    }
    return checkin;
  }
  function draft(state, date) {
    const user = ownTrainee(state);
    if (date > (today || getLocalDateString())) throw new Error('Future dates are for preview only. You cannot check in ahead of time.');
    let checkin = state.checkins.find((row) => row.trainee_id === user.id && row.checkin_date === date);
    if (checkin && checkin.status !== 'draft') throw new Error('This check-in has been submitted and is now read-only.');
    if (!checkin) {
      checkin = { daily_checkin_id: id(state), trainee_id: user.id, checkin_date: date, status: 'draft', trainee_notes: '', wellness: null, submitted_at: null, reviewed_at: null };
      state.checkins.push(checkin);
    }
    return checkin;
  }
  function serializePlan(state, input, coachId, existing) {
    const planId = existing?.workout_plan_id || id(state);
    return {
      workout_plan_id: planId, coach_id: coachId, trainee_id: input.traineeId, plan_name: input.planName.trim(), goal: input.goal, coach_notes: input.coachNotes,
      start_date: input.startDate, end_date: input.endDate, status: 'draft', published_at: null,
      days: input.days.map((day, index) => ({
        workout_day_id: id(state), workout_plan_id: planId, scheduled_date: day.scheduledDate, title: day.title, day_number: index + 1, estimated_duration_minutes: number(day.estimatedDurationMinutes), sort_order: index + 1,
        items: day.items.map((item, order) => {
          let exercise = state.exercises.find((row) => row.exercise_id === Number(item.exerciseId));
          if (!exercise) {
            exercise = { exercise_id: id(state), exercise_name: item.newExerciseName.trim(), equipment: item.equipment, description: item.description || item.instructions, created_by: coachId, is_active: true };
            state.exercises.push(exercise);
          }
          return { workout_item_id: id(state), exercise_id: exercise.exercise_id, exercise, sort_order: order + 1, sets: number(item.sets), reps_min: number(item.repsMin), reps_max: number(item.repsMax), target_weight: number(item.targetWeight), weight_unit: item.weightUnit, duration_seconds: number(item.durationSeconds), rest_seconds: number(item.restSeconds), instructions: item.instructions, training_kind: item.trainingKind || 'strength' };
        }),
      })),
    };
  }
  function connectInternalAccounts(state) {
    const coaches = state.profiles.filter((row) => row.role === 'coach');
    const coachees = state.profiles.filter((row) => row.role === 'trainee');
    for (const coach of coaches) for (const coachee of coachees) {
      if (!state.relationships.some((row) => row.coach_id === coach.id && row.trainee_id === coachee.id)) state.relationships.push({ coach_trainee_id: id(state), coach_id: coach.id, trainee_id: coachee.id, is_primary: coach.id === 'local-ben', started_at: now() });
    }
  }
  async function initialize() {
    if (storage.getItem(LOCAL_DATA_KEY)) {
      const state = read();
      const migrated = migrateEnglishDefaults(state);
      const enriched = seedSamples && addSampleData(migrated, today || getLocalDateString(), serializePlan);
      if (migrated !== state || enriched) write(migrated);
      return;
    }
    const state = { version: 1, contentLocale: 'en-US', sequence: 0, accounts: [], profiles: [], relationships: [], plans: [], exercises: [], diets: [], checkins: [], workouts: [], meals: [], feedback: [] };
    for (const account of DEMO_ACCOUNTS) {
      const salt = crypto.randomUUID();
      state.accounts.push({ id: account.id, email: account.email, salt, hash: await passwordHash(DEMO_PASSWORD, salt) });
      state.profiles.push({ ...account, status: 'active' });
    }
    connectInternalAccounts(state);
    const plan = serializePlan(state, createBasketballWeek(today || getLocalDateString(), 'local-michael'), 'local-ben');
    plan.status = 'published'; plan.published_at = now(); state.plans.push(plan);
    if (seedSamples) addSampleData(state, today || getLocalDateString(), serializePlan);
    // Another tab may have initialized while password hashing was pending.
    if (!storage.getItem(LOCAL_DATA_KEY)) write(state);
  }
  async function session() {
    await ready;
    const state = read();
    const user = profile(state, storage.getItem(LOCAL_SESSION_KEY));
    return user ? { user: { id: user.id, email: user.email } } : null;
  }
  async function emit(event) { const value = await session(); listeners.forEach((listener) => listener(event, value)); }
  async function authCall(action) { try { await ready; read(); return ok(await action()); } catch (error) { return fail(error); } }
  const auth = {
    getSession: () => authCall(async () => ({ session: await session() })),
    getUser: () => authCall(async () => ({ user: (await session())?.user || null })),
    onAuthStateChange(listener) { listeners.add(listener); return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } }; },
    signInWithPassword: ({ email, password }) => authCall(async () => {
      const state = read(); const account = state.accounts.find((row) => row.email === email.trim().toLowerCase());
      if (!account || await passwordHash(password, account.salt) !== account.hash) throw new Error('Incorrect email or password.');
      storage.setItem(LOCAL_SESSION_KEY, account.id); await emit('SIGNED_IN');
      const value = await session(); return { user: value.user, session: value };
    }),
    signUp: ({ email, password, options }) => authCall(async () => {
      const normalizedEmail = email.trim().toLowerCase(); const name = options?.data?.display_name?.trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || password.length < 8) throw new Error('Enter your name, a valid email, and a password of at least 8 characters.');
      const role = options?.data?.local_role === 'coach' ? 'coach' : 'trainee';
      const salt = crypto.randomUUID(); const hash = await passwordHash(password, salt);
      const state = read();
      if (state.accounts.some((row) => row.email === normalizedEmail)) throw new Error('This email is already registered. Please sign in.');
      const userId = crypto.randomUUID();
      state.accounts.push({ id: userId, email: normalizedEmail, salt, hash });
      state.profiles.push({ id: userId, email: normalizedEmail, display_name: name.slice(0, 80), role, status: 'active' });
      connectInternalAccounts(state); write(state); storage.setItem(LOCAL_SESSION_KEY, userId); await emit('SIGNED_IN');
      const value = await session(); return { user: value.user, session: value };
    }),
    signOut: () => authCall(async () => { storage.removeItem(LOCAL_SESSION_KEY); await emit('SIGNED_OUT'); return null; }),
    resetPasswordForEmail: () => Promise.resolve(fail(new Error('Local preview does not send email. Use a demo account or register a new local account.'))),
    updateUser: ({ password }) => authCall(async () => {
      if (password.length < 8) throw new Error('Your password must be at least 8 characters.');
      const user = current(); const salt = crypto.randomUUID(); const hash = await passwordHash(password, salt);
      const state = read(); Object.assign(state.accounts.find((row) => row.id === user.id), { salt, hash }); write(state); return { user };
    }),
  };
  const onStorage = (event) => { if (event.key === LOCAL_SESSION_KEY) emit('SIGNED_IN').catch(() => {}); };
  events?.addEventListener('storage', onStorage);

  const operations = {
    async getDayPlan(date) { const state = read(); const user = ownTrainee(state); return (state.dayPlans || []).find((p) => p.trainee_id === user.id && p.date === date) || null; },
    async saveDayPlan(date, input) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime())) throw new Error('Choose a valid date.');
      const value = validateDayPlan(input); const state = read(); const user = ownTrainee(state);
      if (state.checkins.some((c) => c.trainee_id === user.id && c.checkin_date === date && c.status !== 'draft')) throw new Error('This check-in has been submitted and is now read-only.');
      const plan = { ...value, trainee_id: user.id, date };
      state.dayPlans = [...(state.dayPlans || []).filter((p) => p.trainee_id !== user.id || p.date !== date), plan]; write(state); return plan;
    },
    async getActivityHistory(start, end) {
      const state = read(); const user = ownTrainee(state);
      return state.checkins.filter((c) => c.trainee_id === user.id && c.checkin_date >= start && c.checkin_date <= end && c.status !== 'draft').sort((a, b) => b.checkin_date.localeCompare(a.checkin_date)).map((c) => ({ ...c, workouts: state.workouts.filter((w) => w.daily_checkin_id === c.daily_checkin_id), feedback: state.feedback.filter((f) => f.daily_checkin_id === c.daily_checkin_id) }));
    },
    async getCurrentProfile(userId) { const state = read(); const user = current(state); if (userId && userId !== user.id) throw new Error('You do not have permission to view this profile.'); return user; },
    async getCoachRoster() { const state = read(); const user = current(state); if (user.role !== 'coach') throw new Error('Please sign in with a Coach account.'); return state.relationships.filter((row) => row.coach_id === user.id).map((row) => ({ ...profile(state, row.trainee_id), relationshipId: row.coach_trainee_id, isPrimary: row.is_primary, startedAt: row.started_at })); },
    async getCoachExercises() { const state = read(); current(state); return state.exercises; },
    async getCoachPublishedPlans(traineeIds) { const state = read(); const user = current(state); return state.plans.filter((row) => row.coach_id === user.id && traineeIds.includes(row.trainee_id) && row.status !== 'draft').sort((a, b) => b.published_at.localeCompare(a.published_at)); },
    async getCoachPlans(traineeId) { const state = read(); const user = coachFor(state, traineeId); return state.plans.filter((row) => row.coach_id === user.id && row.trainee_id === traineeId); },
    async getTraineeWeek(start, end) { const state = read(); const user = ownTrainee(state); return state.plans.filter((row) => row.trainee_id === user.id && row.status !== 'draft').flatMap((row) => row.days).filter((day) => day.scheduled_date >= start && day.scheduled_date <= end); },
    async getTraineeWorkout(date) { const state = read(); const user = ownTrainee(state); const plans = state.plans.filter((row) => row.trainee_id === user.id && row.status !== 'draft' && row.start_date <= date && row.end_date >= date); return { plans: plans.map(({ days, ...plan }) => plan), days: plans.flatMap(({ days, ...plan }) => days.filter((day) => day.scheduled_date === date).map((day) => ({ ...day, plan }))) }; },
    async saveWorkoutPlan(input, { publish = false } = {}) {
      const state = read(); const user = coachFor(state, input.traineeId);
      const existing = input.workoutPlanId ? state.plans.find((row) => row.workout_plan_id === input.workoutPlanId && row.coach_id === user.id) : null;
      if (input.workoutPlanId && !existing) throw new Error('Plan not found or you do not have permission to edit it.');
      if (existing && state.workouts.some((log) => existing.days.some((day) => day.workout_day_id === log.workout_day_id))) throw new Error('This plan already has workout logs. Keep it as history and create a new plan for next week.');
      if (publish && state.plans.some((row) => row.workout_plan_id !== existing?.workout_plan_id && row.trainee_id === input.traineeId && row.status !== 'draft' && row.days.some((day) => input.days.some((next) => next.scheduledDate === day.scheduled_date)))) throw new Error('This coachee already has a published plan on these dates. Edit that plan or choose another week.');
      const plan = serializePlan(state, input, user.id, existing);
      if (publish) { plan.status = 'published'; plan.published_at = now(); }
      state.plans = state.plans.filter((row) => row.workout_plan_id !== plan.workout_plan_id); state.plans.push(plan); write(state);
      return { workoutPlanId: plan.workout_plan_id };
    },
    async getTraineeDiet(date) { const state = read(); const user = ownTrainee(state); const plan = state.diets.find((row) => row.trainee_id === user.id && row.scheduled_date === date && row.status !== 'draft'); return { plan: plan || null, meals: plan?.meals || [] }; },
    async saveDietPlan(input, { publish = false } = {}) {
      const state = read(); const user = coachFor(state, input.traineeId);
      const existing = state.diets.find((row) => row.trainee_id === input.traineeId && row.scheduled_date === input.scheduledDate);
      if (existing && (existing.coach_id !== user.id || existing.status !== 'draft')) throw new Error('This date already has a published plan or another coach plan. Choose a different date.');
      const planId = existing?.diet_plan_id || id(state);
      const plan = { diet_plan_id: planId, coach_id: user.id, trainee_id: input.traineeId, scheduled_date: input.scheduledDate, status: publish ? 'published' : 'draft', coach_notes: input.coachNotes, target_calories: number(input.targetCalories), target_protein_g: number(input.targetProteinG), target_carbs_g: number(input.targetCarbsG), target_fat_g: number(input.targetFatG), meals: input.meals.filter((meal) => meal.mealName.trim() || meal.mealDetails.trim()).map((meal, index) => ({ diet_meal_id: id(state), diet_plan_id: planId, meal_type: meal.mealType, meal_name: meal.mealName, meal_details: meal.mealDetails, sort_order: index + 1 })) };
      state.diets = state.diets.filter((row) => row.diet_plan_id !== planId); state.diets.push(plan); write(state); return { dietPlanId: planId };
    },
    async getDailyCheckin(date) { const state = read(); const user = ownTrainee(state); const checkin = state.checkins.find((row) => row.trainee_id === user.id && row.checkin_date === date); return checkin ? operations.getCheckinBundle(checkin.daily_checkin_id) : { checkin: null, workouts: [], dietLogs: [], feedback: [] }; },
    async getCheckinBundle(checkinId) {
      const state = read(); const checkin = visibleCheckin(state, checkinId);
      return { checkin, workouts: state.workouts.filter((row) => row.daily_checkin_id === checkinId), dietLogs: await Promise.all(state.meals.filter((row) => row.daily_checkin_id === checkinId).map(async (row) => ({ ...row, photoUrl: await localPhotoUrl(row.photo_path) }))), feedback: state.feedback.filter((row) => row.daily_checkin_id === checkinId).map((row) => ({ ...row, coach: profile(state, row.coach_id) })) };
    },
    async getTraineeStreak(date) { const state = read(); const user = ownTrainee(state); return calculateStreak(state.checkins.filter((row) => row.trainee_id === user.id), date); },
    async saveWellness(date, input) { const wellness = validateWellness(input); const state = read(); const checkin = draft(state, date); checkin.wellness = wellness; write(state); return checkin; },
    async saveWorkoutCheckin(date, input) {
      const state = read(); const checkin = draft(state, date);
      const day = state.plans.filter((row) => row.trainee_id === checkin.trainee_id && row.status !== 'draft').flatMap((row) => row.days).find((row) => row.workout_day_id === input.workoutDayId && row.scheduled_date === date);
      if (!day || !['completed', 'in_progress', 'skipped'].includes(input.status)) throw new Error('Invalid workout log.');
      const duration = number(input.actualDurationMinutes); if (duration !== null && (!Number.isInteger(duration) || duration < 0 || duration > 1440)) throw new Error('Enter a valid duration between 0 and 1440 minutes.');
      const existing = state.workouts.find((row) => row.daily_checkin_id === checkin.daily_checkin_id && row.workout_day_id === day.workout_day_id);
      const log = { workout_checkin_id: existing?.workout_checkin_id || id(state), daily_checkin_id: checkin.daily_checkin_id, workout_day_id: day.workout_day_id, title: day.title, status: input.status, actual_duration_minutes: duration, trainee_notes: input.traineeNotes };
      state.workouts = state.workouts.filter((row) => row.workout_checkin_id !== log.workout_checkin_id); state.workouts.push(log); write(state); return log;
    },
    async saveDietLog(date, input) {
      let photoPath = null;
      const user = ownTrainee(read());
      if (input.photoFile) { validateMealPhoto(input.photoFile); photoPath = `${user.id}/${crypto.randomUUID()}`; await saveLocalPhoto(photoPath, input.photoFile); }
      try {
        const state = read(); if (current(state).id !== user.id) throw new Error('The signed-in account changed. Please save again.'); const checkin = draft(state, date);
        if (!input.actualFood?.trim() && !photoPath) throw new Error('Describe your meal or upload a photo.');
        for (const key of ['actualCalories', 'actualProteinG', 'actualCarbsG', 'actualFatG']) if (number(input[key]) !== null && (!Number.isFinite(number(input[key])) || number(input[key]) < 0)) throw new Error('Nutrition values must be non-negative numbers.');
        const log = { diet_log_id: id(state), daily_checkin_id: checkin.daily_checkin_id, diet_meal_id: input.dietMealId || null, meal_type: input.mealType, actual_food: input.actualFood, actual_calories: number(input.actualCalories), actual_protein_g: number(input.actualProteinG), actual_carbs_g: number(input.actualCarbsG), actual_fat_g: number(input.actualFatG), photo_path: photoPath, logged_at: now() };
        state.meals.push(log); write(state); return log;
      } catch (error) { if (photoPath) await deleteLocalPhoto(photoPath); throw error; }
    },
    async submitDailyCheckin(date, notes = '') { const state = read(); const checkin = draft(state, date); validateWellness(checkin.wellness); Object.assign(checkin, { status: 'submitted', trainee_notes: notes.trim(), submitted_at: now() }); write(state); return checkin; },
    async getCoachCheckins(traineeIds) { const state = read(); traineeIds.forEach((trainee) => coachFor(state, trainee)); return state.checkins.filter((row) => traineeIds.includes(row.trainee_id) && row.status !== 'draft').sort((a, b) => b.checkin_date.localeCompare(a.checkin_date)); },
    async getCoachSummary(traineeIds) { const state = read(); const checkins = await operations.getCoachCheckins(traineeIds); const ids = new Set(checkins.map((row) => row.daily_checkin_id)); return { checkins, workoutLogs: state.workouts.filter((row) => ids.has(row.daily_checkin_id)), dietLogs: state.meals.filter((row) => ids.has(row.daily_checkin_id)) }; },
    async submitCoachFeedback(checkinId, content) {
      const state = read(); const checkin = visibleCheckin(state, checkinId); const user = coachFor(state, checkin.trainee_id);
      if (!content?.trim()) throw new Error('Please enter your feedback.');
      const feedback = { feedback_id: id(state), daily_checkin_id: checkinId, coach_id: user.id, feedback_content: content.trim(), created_at: now() };
      state.feedback.push(feedback); checkin.status = 'reviewed'; checkin.reviewed_at = now(); write(state); return { feedback, checkin };
    },
  };
  return { isLocal: true, auth, operations: Object.fromEntries(Object.entries(operations).map(([name, action]) => [name, async (...args) => { await ready; return copy(await action(...args)); }])), dispose() { events?.removeEventListener('storage', onStorage); listeners.clear(); } };
}
