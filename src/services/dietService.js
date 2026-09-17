import {
  AppServiceError, asNumberOrNull, assertResult, isUniqueViolation, requireUser,
} from './serviceUtils.js';

export async function getTraineeDiet(client, date) {
  if (client?.isLocal) return client.operations.getTraineeDiet(date);
  const user = await requireUser(client);
  const plan = assertResult(
    await client
      .from('diet_plans')
      .select('diet_plan_id, scheduled_date, target_calories, target_protein_g, target_carbs_g, target_fat_g, coach_notes, status')
      .eq('trainee_id', user.id)
      .eq('scheduled_date', date)
      .in('status', ['published', 'archived'])
      .maybeSingle(),
    'Unable to load the daily nutrition plan.',
  );
  if (!plan) return { plan: null, meals: [] };
  const meals = assertResult(
    await client
      .from('diet_meals')
      .select('diet_meal_id, meal_type, meal_name, meal_details, sort_order')
      .eq('diet_plan_id', plan.diet_plan_id)
      .order('sort_order', { ascending: true }),
    'Unable to load planned meals.',
  ) || [];
  return { plan, meals };
}

export async function saveDietPlan(client, input, { publish = false } = {}) {
  if (!input.traineeId || !input.scheduledDate) {
    throw new AppServiceError('Select a coachee and a plan date.', { code: 'VALIDATION_ERROR' });
  }
  if (client?.isLocal) return client.operations.saveDietPlan(input, { publish });
  const user = await requireUser(client);
  let planId = input.dietPlanId || null;
  let createdNow = false;

  if (!planId) {
    const existing = assertResult(
      await client.from('diet_plans').select('diet_plan_id, coach_id, status').eq('trainee_id', input.traineeId).eq('scheduled_date', input.scheduledDate).maybeSingle(),
      'Unable to check the nutrition plan for this date.',
    );
    if (existing && existing.coach_id !== user.id) {
      throw new AppServiceError('Another coach has already created a plan for this coachee on this date. It cannot be overwritten.', { code: 'PLAN_CONFLICT' });
    }
    if (existing?.status && existing.status !== 'draft') {
      throw new AppServiceError('The nutrition plan for this date is published and cannot be overwritten as a new draft.', { code: 'PLAN_ALREADY_PUBLISHED' });
    }
    planId = existing?.diet_plan_id || null;
  }

  const record = {
    coach_id: user.id,
    trainee_id: input.traineeId,
    scheduled_date: input.scheduledDate,
    target_calories: asNumberOrNull(input.targetCalories),
    target_protein_g: asNumberOrNull(input.targetProteinG),
    target_carbs_g: asNumberOrNull(input.targetCarbsG),
    target_fat_g: asNumberOrNull(input.targetFatG),
    coach_notes: input.coachNotes?.trim() || null,
    status: 'draft',
    published_at: null,
  };

  try {
    if (planId) {
      const updated = assertResult(
        await client.from('diet_plans').update(record).eq('diet_plan_id', planId).select('diet_plan_id').single(),
        'Unable to update the nutrition draft.',
      );
      planId = updated.diet_plan_id;
      assertResult(await client.from('diet_meals').delete().eq('diet_plan_id', planId), 'Unable to remove existing meals.');
    } else {
      const created = assertResult(
        await client.from('diet_plans').insert(record).select('diet_plan_id').single(),
        'Unable to create the nutrition draft.',
      );
      planId = created.diet_plan_id;
      createdNow = true;
    }

    const meals = (input.meals || []).map((meal, index) => ({
      diet_plan_id: planId,
      meal_type: meal.mealType,
      meal_name: meal.mealName?.trim() || null,
      meal_details: meal.mealDetails?.trim() || null,
      sort_order: index + 1,
    }));
    if (!meals.length) {
      throw new AppServiceError('Add at least one meal.', { code: 'VALIDATION_ERROR' });
    }
    assertResult(await client.from('diet_meals').insert(meals), 'Unable to save planned meals.');

    if (publish) {
      assertResult(
        await client.from('diet_plans').update({ status: 'published', published_at: new Date().toISOString() }).eq('diet_plan_id', planId).select('diet_plan_id').single(),
        'Unable to publish the nutrition plan.',
      );
    }
    return { dietPlanId: planId, status: publish ? 'published' : 'draft' };
  } catch (error) {
    if (createdNow && planId) {
      try {
        await client.from('diet_meals').delete().eq('diet_plan_id', planId);
        await client.from('diet_plans').delete().eq('diet_plan_id', planId);
      } catch {
        // Preserve the primary error; an incomplete plan remains draft and invisible.
      }
    }
    if (isUniqueViolation(error?.cause || error)) {
      throw new AppServiceError('This coachee already has a nutrition plan for this date. Refresh and edit the existing draft.', { code: 'PLAN_CONFLICT', cause: error });
    }
    throw error;
  }
}
