import {
  AppServiceError, asNumberOrNull, assertResult, requireUser,
} from './serviceUtils.js';

function normalizeWorkoutItem(item, workoutDayId, sortOrder) {
  return {
    workout_day_id: workoutDayId,
    exercise_id: Number(item.exerciseId),
    sort_order: sortOrder,
    sets: Number(item.sets),
    reps_min: asNumberOrNull(item.repsMin),
    reps_max: asNumberOrNull(item.repsMax),
    target_weight: asNumberOrNull(item.targetWeight),
    weight_unit: item.weightUnit || null,
    duration_seconds: asNumberOrNull(item.durationSeconds),
    rest_seconds: asNumberOrNull(item.restSeconds),
    instructions: item.instructions?.trim() || null,
  };
}

function validatePlanInput(plan) {
  if (!plan.traineeId || !plan.planName?.trim() || !plan.startDate || !plan.endDate) {
    throw new AppServiceError('Select a coachee and enter a plan name, start date, and end date.', { code: 'VALIDATION_ERROR' });
  }
  if (plan.endDate < plan.startDate) {
    throw new AppServiceError('The end date cannot be before the start date.', { code: 'VALIDATION_ERROR' });
  }
  if (!plan.days?.length || plan.days.some((day) => !day.scheduledDate || !day.title?.trim() || !day.items?.length)) {
    throw new AppServiceError('Each training day needs a date, title, and at least one exercise.', { code: 'VALIDATION_ERROR' });
  }
  if (plan.days.some((day) => day.scheduledDate < plan.startDate || day.scheduledDate > plan.endDate)) {
    throw new AppServiceError('Training days must fall within the plan dates.', { code: 'VALIDATION_ERROR' });
  }
  if (plan.days.some((day) => day.items.some((item) => !Number.isInteger(Number(item.sets)) || Number(item.sets) < 1))) {
    throw new AppServiceError('Sets must be a whole number greater than 0 for every exercise.', { code: 'VALIDATION_ERROR' });
  }
  if (new Set(plan.days.map((day) => day.scheduledDate)).size !== plan.days.length) {
    throw new AppServiceError('A plan can have only one training day per date. Combine that day into one session.', { code: 'VALIDATION_ERROR' });
  }
  for (const day of plan.days) {
    for (const item of day.items) {
      if (!item.exerciseId && !item.newExerciseName?.trim()) throw new AppServiceError('Enter an exercise name or select an existing exercise.', { code: 'VALIDATION_ERROR' });
      for (const key of ['repsMin', 'repsMax', 'targetWeight', 'durationSeconds', 'restSeconds']) {
        const value = item[key];
        if (value !== '' && value != null && (!Number.isFinite(Number(value)) || Number(value) < 0 || (key !== 'targetWeight' && !Number.isInteger(Number(value))))) throw new AppServiceError('Reps, duration, and weight must be valid non-negative numbers.', { code: 'VALIDATION_ERROR' });
      }
      if (item.repsMin !== '' && item.repsMax !== '' && Number(item.repsMax) < Number(item.repsMin)) throw new AppServiceError('Maximum reps cannot be less than minimum reps.', { code: 'VALIDATION_ERROR' });
    }
  }
}

export async function getTraineeWorkout(client, date) {
  if (client?.isLocal) return client.operations.getTraineeWorkout(date);
  const user = await requireUser(client);
  const plans = assertResult(
    await client
      .from('workout_plans')
      .select('workout_plan_id, plan_name, goal, coach_notes, start_date, end_date, status')
      .eq('trainee_id', user.id)
      .in('status', ['published', 'archived'])
      .lte('start_date', date)
      .gte('end_date', date)
      .order('published_at', { ascending: false }),
    'Unable to load the daily workout plan.',
  ) || [];
  if (!plans.length) return { plans: [], days: [] };

  const days = assertResult(
    await client
      .from('workout_days')
      .select('workout_day_id, workout_plan_id, scheduled_date, day_number, title, estimated_duration_minutes, sort_order')
      .in('workout_plan_id', plans.map((plan) => plan.workout_plan_id))
      .eq('scheduled_date', date)
      .order('sort_order', { ascending: true }),
    'Unable to load the daily workout.',
  ) || [];
  if (!days.length) return { plans, days: [] };

  const items = assertResult(
    await client
      .from('workout_items')
      .select('workout_item_id, workout_day_id, exercise_id, sort_order, sets, reps_min, reps_max, target_weight, weight_unit, duration_seconds, rest_seconds, instructions, exercise:exercises(exercise_id, exercise_name, description, equipment, video_url)')
      .in('workout_day_id', days.map((day) => day.workout_day_id))
      .order('sort_order', { ascending: true}),
    'Unable to load exercises.',
  ) || [];

  return {
    plans,
    days: days.map((day) => ({
      ...day,
      plan: plans.find((plan) => plan.workout_plan_id === day.workout_plan_id),
      items: items.filter((item) => item.workout_day_id === day.workout_day_id),
    })),
  };
}

// NEW: Get trainee's weekly workout overview
export async function getTraineeWeeklyPlan(client, startDate, endDate) {
  if (client?.isLocal) return client.operations.getTraineeWeek?.(startDate, endDate) || [];
  const user = await requireUser(client);

  const plans = assertResult(
    await client
      .from('workout_plans')
      .select('workout_plan_id, plan_name, start_date, end_date')
      .eq('trainee_id', user.id)
      .in('status', ['published', 'archived'])
      .lte('start_date', endDate)
      .gte('end_date', startDate),
    'Unable to load weekly workout plans.',
  ) || [];

  if (!plans.length) return [];

  const days = assertResult(
    await client
      .from('workout_days')
      .select('workout_day_id, workout_plan_id, scheduled_date, title, estimated_duration_minutes')
      .in('workout_plan_id', plans.map((p) => p.workout_plan_id))
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true }),
    'Unable to load weekly workouts.',
  ) || [];

  return days.map((day) => ({
    ...day,
    plan: plans.find((p) => p.workout_plan_id === day.workout_plan_id),
  }));
}

// NEW: Get trainee's all workout plans (for history view)
export async function getTraineeAllPlans(client) {
  if (client?.isLocal) return client.operations.getTraineeAllPlans?.() || [];
  const user = await requireUser(client);

  return assertResult(
    await client
      .from('workout_plans')
      .select('workout_plan_id, plan_name, goal, start_date, end_date, status, published_at')
      .eq('trainee_id', user.id)
      .in('status', ['published', 'archived'])
      .order('start_date', { ascending: false })
      .limit(20),
    'Unable to load workout history.',
  ) || [];
}

export async function getCoachExercises(client) {
  if (client?.isLocal) return client.operations.getCoachExercises();
  await requireUser(client);
  return assertResult(
    await client
      .from('exercises')
      .select('exercise_id, exercise_name, description, equipment, video_url, created_by')
      .eq('is_active', true)
      .order('exercise_name', { ascending: true }),
    'Unable to load the exercise library.',
  ) || [];
}

export async function getCoachPublishedPlans(client, traineeIds = []) {
  if (client?.isLocal) return client.operations.getCoachPublishedPlans(traineeIds);
  await requireUser(client);
  if (!traineeIds.length) return [];
  return assertResult(
    await client
      .from('workout_plans')
      .select('workout_plan_id, trainee_id, plan_name, goal, status, start_date, end_date, published_at')
      .in('trainee_id', traineeIds)
      .in('status', ['published', 'archived'])
      .order('published_at', { ascending: false }),
    'Unable to load the coachee plan overview.',
  ) || [];
}

async function createExercise(client, userId, item) {
  if (!item.newExerciseName?.trim()) {
    throw new AppServiceError('Select an existing exercise or enter a new exercise name.', { code: 'VALIDATION_ERROR' });
  }
  const exerciseName = item.newExerciseName.trim();
  const existing = assertResult(
    await client.from('exercises').select('exercise_id').eq('created_by', userId).eq('exercise_name', exerciseName).limit(1).maybeSingle(),
    'Unable to check existing exercises.',
  );
  if (existing) return existing.exercise_id;
  const data = assertResult(
    await client.from('exercises').insert({
      exercise_name: exerciseName,
      description: item.description?.trim() || null,
      equipment: item.equipment?.trim() || null,
      created_by: userId,
    }).select('exercise_id').single(),
    'Unable to create the exercise.',
  );
  return data.exercise_id;
}

async function deletePlanChildren(client, workoutPlanId) {
  const days = assertResult(
    await client.from('workout_days').select('workout_day_id').eq('workout_plan_id', workoutPlanId),
    'Unable to load existing training days.',
  ) || [];
  if (days.length) {
    assertResult(
      await client.from('workout_items').delete().in('workout_day_id', days.map((day) => day.workout_day_id)),
      'Unable to remove existing workout items.',
    );
  }
  assertResult(
    await client.from('workout_days').delete().eq('workout_plan_id', workoutPlanId),
    'Unable to remove existing training days.',
  );
}

async function bestEffortDeletePlan(client, workoutPlanId) {
  try {
    await deletePlanChildren(client, workoutPlanId);
    await client.from('workout_plans').delete().eq('workout_plan_id', workoutPlanId);
  } catch {
    // Expected: a day was logged
  }
}

export async function saveDraft(client, input, { publish = false } = {}) {
  validatePlanInput(input);
  if (client?.isLocal) return client.operations.saveDraft(input, { publish });
  const user = await requireUser(client);
  const existing = input.workoutPlanId ? assertResult(await client.from('workout_plans').select('workout_plan_id, status, trainee_id').eq('workout_plan_id', input.workoutPlanId).eq('coach_id', user.id).eq('status', 'draft').maybeSingle(), 'Unable to check if the draft still exists.') : null;
  if (input.workoutPlanId && !existing) throw new AppServiceError('This draft no longer exists or is no longer editable.', { code: 'NOT_FOUND' });
  const workoutPlanId = existing?.workout_plan_id || null;

  for (const day of input.days) {
    for (const item of day.items) {
      if (item.newExerciseName && !item.exerciseId) item.exerciseId = await createExercise(client, user.id, item);
    }
  }

  if (workoutPlanId) {
    await deletePlanChildren(client, workoutPlanId);
    assertResult(
      await client.from('workout_plans').update({
        trainee_id: input.traineeId,
        plan_name: input.planName.trim(),
        goal: input.goal?.trim() || null,
        coach_notes: input.coachNotes?.trim() || null,
        start_date: input.startDate,
        end_date: input.endDate,
        updated_at: new Date().toISOString(),
      }).eq('workout_plan_id', workoutPlanId),
      'Unable to update the draft.',
    );
  } else {
    const plan = assertResult(
      await client.from('workout_plans').insert({
        coach_id: user.id,
        trainee_id: input.traineeId,
        plan_name: input.planName.trim(),
        goal: input.goal?.trim() || null,
        coach_notes: input.coachNotes?.trim() || null,
        start_date: input.startDate,
        end_date: input.endDate,
        status: 'draft',
      }).select('workout_plan_id').single(),
      'Unable to create the draft.',
    );
    input.workoutPlanId = plan.workout_plan_id;
  }

  for (const day of input.days) {
    const dayData = assertResult(
      await client.from('workout_days').insert({
        workout_plan_id: input.workoutPlanId,
        scheduled_date: day.scheduledDate,
        day_number: asNumberOrNull(day.dayNumber),
        title: day.title.trim(),
        estimated_duration_minutes: asNumberOrNull(day.estimatedDurationMinutes),
        sort_order: day.sortOrder ?? 1,
      }).select('workout_day_id').single(),
      'Unable to save a training day.',
    );
    const dayId = dayData.workout_day_id;
    if (day.items.length) {
      assertResult(
        await client.from('workout_items').insert(day.items.map((item, index) => normalizeWorkoutItem(item, dayId, index + 1))),
        'Unable to save workout items.',
      );
    }
  }

  if (publish) await publishDraft(client, input.workoutPlanId);
  return { workoutPlanId: input.workoutPlanId };
}

// Backward-compatible service name used by older local integrations.
export async function saveWorkoutPlan(client, input, options = {}) {
  return saveDraft(client, input, options);
}

export async function publishDraft(client, workoutPlanId) {
  if (client?.isLocal) return client.operations.publishDraft(workoutPlanId);
  const user = await requireUser(client);
  const existing = assertResult(
    await client.from('workout_plans').select('workout_plan_id, status').eq('workout_plan_id', workoutPlanId).eq('coach_id', user.id).eq('status', 'draft').maybeSingle(),
    'Unable to check if the draft still exists.',
  );
  if (!existing) throw new AppServiceError('This draft no longer exists or was already published.', { code: 'NOT_FOUND' });
  assertResult(
    await client.from('workout_plans').update({ status: 'published', published_at: new Date().toISOString() }).eq('workout_plan_id', workoutPlanId),
    'Unable to publish the workout plan.',
  );
}

export async function deleteDraft(client, workoutPlanId) {
  if (client?.isLocal) return client.operations.deleteDraft(workoutPlanId);
  const user = await requireUser(client);
  const existing = assertResult(
    await client.from('workout_plans').select('workout_plan_id, status').eq('workout_plan_id', workoutPlanId).eq('coach_id', user.id).eq('status', 'draft').maybeSingle(),
    'Unable to check if the draft still exists.',
  );
  if (!existing) return;
  await bestEffortDeletePlan(client, workoutPlanId);
}

export async function getCoachDraft(client, workoutPlanId) {
  if (client?.isLocal) return client.operations.getCoachDraft(workoutPlanId);
  const user = await requireUser(client);
  const plan = assertResult(
    await client
      .from('workout_plans')
      .select('workout_plan_id, trainee_id, plan_name, goal, coach_notes, start_date, end_date, status')
      .eq('workout_plan_id', workoutPlanId)
      .eq('coach_id', user.id)
      .eq('status', 'draft')
      .maybeSingle(),
    'Unable to load the draft.',
  );
  if (!plan) throw new AppServiceError('This draft no longer exists or is no longer editable.', { code: 'NOT_FOUND' });

  const days = assertResult(
    await client
      .from('workout_days')
      .select('workout_day_id, scheduled_date, day_number, title, estimated_duration_minutes, sort_order')
      .eq('workout_plan_id', workoutPlanId)
      .order('sort_order', { ascending: true }),
    'Unable to load training days.',
  ) || [];

  const items = days.length ? assertResult(
    await client
      .from('workout_items')
      .select('workout_item_id, workout_day_id, exercise_id, sort_order, sets, reps_min, reps_max, target_weight, weight_unit, duration_seconds, rest_seconds, instructions, exercise:exercises(exercise_id, exercise_name, description, equipment, video_url)')
      .in('workout_day_id', days.map((day) => day.workout_day_id))
      .order('workout_day_id', { ascending: true })
      .order('sort_order', { ascending: true }),
    'Unable to load workout items.',
  ) : [];

  return {
    ...plan,
    days: days.map((day) => ({
      ...day,
      items: (items || []).filter((item) => item.workout_day_id === day.workout_day_id),
    })),
  };
}

export async function getCoachPlans(client, traineeId) {
  if (client?.isLocal) return client.operations.getCoachPlans(traineeId);
  const user = await requireUser(client);
  return assertResult(await client.from('workout_plans')
    .select('*, days:workout_days(*, items:workout_items(*, exercise:exercises(*)))')
    .eq('coach_id', user.id).eq('trainee_id', traineeId)
    .order('start_date', { ascending: false }), 'Unable to load assigned plans.') || [];
}
