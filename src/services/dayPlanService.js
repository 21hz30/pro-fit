import { validateDayPlan } from '../domain/dayPlanner.js';
import { getLocalDateString } from '../utils/date.js';
import { ensureDraftCheckin } from './checkinService.js';
import { AppServiceError, assertResult, requireUser } from './serviceUtils.js';

const fields = 'day_plan_id, trainee_id, plan_date, available_minutes, school_load, energy';

function validateDate(date) {
  const parsed = new Date(`${date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || getLocalDateString(parsed) !== date) {
    throw new AppServiceError('Choose a valid date.', { code: 'VALIDATION_ERROR' });
  }
}

function planResult(result) {
  if (result.error?.code === 'PGRST205' || result.error?.code === '42P01') {
    throw new AppServiceError('Daily planning is not connected in this workspace yet.', { code: 'DAY_PLANNING_UNAVAILABLE' });
  }
  const row = assertResult(result, 'Unable to load or save daily priorities.');
  return row ? { availableMinutes: row.available_minutes, schoolLoad: row.school_load, energy: row.energy } : null;
}

export async function getDayPlan(client, date) {
  validateDate(date);
  if (client?.isLocal) return client.operations.getDayPlan(date);
  const user = await requireUser(client);
  return planResult(await client.from('day_plans').select(fields).eq('trainee_id', user.id).eq('plan_date', date).maybeSingle());
}

export async function saveDayPlan(client, date, input) {
  validateDate(date);
  const plan = validateDayPlan(input);
  if (date > getLocalDateString()) {
    throw new AppServiceError('Future dates are for preview only.', { code: 'VALIDATION_ERROR' });
  }
  if (client?.isLocal) return client.operations.saveDayPlan(date, plan);
  const user = await requireUser(client);
  await ensureDraftCheckin(client, date);
  return planResult(await client.from('day_plans').upsert({
    trainee_id: user.id,
    plan_date: date,
    available_minutes: plan.availableMinutes,
    school_load: plan.schoolLoad,
    energy: plan.energy,
  }, { onConflict: 'trainee_id,plan_date' }).select(fields).single());
}
