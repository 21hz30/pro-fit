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
      .select('workout_item_id, workout_day_id, exercise_id, sort_order, sets, reps_min, reps_max, target_weight, weight_unit, duration_seconds, rest_seconds, instructions, exercise:exercises(exercise_id, exercise_name, description, equipment)')
      .in('workout_day_id', days.map((day) => day.workout_day_id))
      .order('sort_order', { ascending: true }),
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

export async function getCoachExercises(client) {
  if (client?.isLocal) return client.operations.getCoachExercises();
  await requireUser(client);
  return assertResult(
    await client
      .from('exercises')
      .select('exercise_id, exercise_name, description, equipment, created_by')
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
    // Preserve the primary error; an incomplete plan remains draft and invisible to trainees.
  }
}

export async function saveWorkoutPlan(client, input, { publish = false } = {}) {
  validatePlanInput(input);
  if (client?.isLocal) return client.operations.saveWorkoutPlan(input, { publish });
  const user = await requireUser(client);
  let workoutPlanId = input.workoutPlanId || null;
  let createdNow = false;

  const planRecord = {
    coach_id: user.id,
    trainee_id: input.traineeId,
    plan_name: input.planName.trim(),
    goal: input.goal?.trim() || null,
    coach_notes: input.coachNotes?.trim() || null,
    start_date: input.startDate,
    end_date: input.endDate,
    status: 'draft',
    published_at: null,
  };

  try {
    if (workoutPlanId) {
      const updated = assertResult(
        await client.from('workout_plans').update(planRecord).eq('workout_plan_id', workoutPlanId).select('workout_plan_id').single(),
        'Unable to update the workout draft.',
      );
      workoutPlanId = updated.workout_plan_id;
      await deletePlanChildren(client, workoutPlanId);
    } else {
      const created = assertResult(
        await client.from('workout_plans').insert(planRecord).select('workout_plan_id').single(),
        'Unable to create the workout draft.',
      );
      workoutPlanId = created.workout_plan_id;
      createdNow = true;
    }

    for (let dayIndex = 0; dayIndex < input.days.length; dayIndex += 1) {
      const day = input.days[dayIndex];
      const dayRecord = assertResult(
        await client.from('workout_days').insert({
          workout_plan_id: workoutPlanId,
          scheduled_date: day.scheduledDate,
          day_number: dayIndex + 1,
          title: day.title.trim(),
          estimated_duration_minutes: asNumberOrNull(day.estimatedDurationMinutes),
          sort_order: dayIndex + 1,
        }).select('workout_day_id').single(),
        'Unable to create the training day.',
      );

      const itemRecords = [];
      for (let itemIndex = 0; itemIndex < day.items.length; itemIndex += 1) {
        const item = day.items[itemIndex];
        const exerciseId = item.exerciseId || await createExercise(client, user.id, item);
        itemRecords.push(normalizeWorkoutItem({ ...item, exerciseId }, dayRecord.workout_day_id, itemIndex + 1));
      }
      assertResult(await client.from('workout_items').insert(itemRecords), 'Unable to save workout items.');
    }

    if (publish) {
      assertResult(
        await client.from('workout_plans').update({ status: 'published', published_at: new Date().toISOString() }).eq('workout_plan_id', workoutPlanId).select('workout_plan_id').single(),
        'Unable to publish the workout plan.',
      );
    }
    return { workoutPlanId, status: publish ? 'published' : 'draft' };
  } catch (error) {
    if (createdNow && workoutPlanId) await bestEffortDeletePlan(client, workoutPlanId);
    throw error;
  }
}
