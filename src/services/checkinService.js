import { AppServiceError, asNumberOrNull, assertResult, isUniqueViolation, requireUser } from './serviceUtils.js';
import { calculateStreak } from '../utils/date.js';
import { createMealPhotoSignedUrl, removeMealPhoto, uploadMealPhoto } from './storageService.js';

export async function getDailyCheckin(client, date) {
  if (client?.isLocal) return client.operations.getDailyCheckin(date);
  const user = await requireUser(client);
  const checkin = assertResult(
    await client
      .from('daily_checkins')
      .select('daily_checkin_id, trainee_id, checkin_date, status, trainee_notes, submitted_at, reviewed_at')
      .eq('trainee_id', user.id)
      .eq('checkin_date', date)
      .maybeSingle(),
    'Unable to load the daily check-in.',
  );
  if (!checkin) return { checkin: null, workouts: [], dietLogs: [], feedback: [] };
  return getCheckinBundle(client, checkin.daily_checkin_id, checkin);
}

export async function getCheckinBundle(client, dailyCheckinId, knownCheckin = null) {
  if (client?.isLocal) return client.operations.getCheckinBundle(dailyCheckinId);
  await requireUser(client);
  const checkin = knownCheckin || assertResult(
    await client
      .from('daily_checkins')
      .select('daily_checkin_id, trainee_id, checkin_date, status, trainee_notes, submitted_at, reviewed_at')
      .eq('daily_checkin_id', dailyCheckinId)
      .maybeSingle(),
    'Unable to load the check-in.',
  );
  if (!checkin) {
    throw new AppServiceError('Check-in not found or you do not have permission to view it.', { code: 'CHECKIN_NOT_FOUND' });
  }

  const [workoutsResult, dietResult, feedbackResult] = await Promise.all([
    client
      .from('workout_checkins')
      .select('workout_checkin_id, daily_checkin_id, workout_day_id, status, actual_duration_minutes, trainee_notes, started_at, completed_at')
      .eq('daily_checkin_id', dailyCheckinId),
    client
      .from('diet_logs')
      .select('diet_log_id, daily_checkin_id, diet_meal_id, meal_type, actual_food, actual_calories, actual_protein_g, actual_carbs_g, actual_fat_g, photo_path, logged_at')
      .eq('daily_checkin_id', dailyCheckinId)
      .order('logged_at', { ascending: true }),
    client
      .from('coach_feedback')
      .select('feedback_id, coach_id, feedback_content, created_at, coach:profiles!coach_feedback_coach_id_fkey(display_name)')
      .eq('daily_checkin_id', dailyCheckinId)
      .order('created_at', { ascending: true }),
  ]);
  const workouts = assertResult(workoutsResult, 'Unable to load workout logs.') || [];
  const dietLogs = assertResult(dietResult, 'Unable to load meal logs.') || [];
  const feedback = assertResult(feedbackResult, 'Unable to load coach feedback.') || [];
  const dietLogsWithUrls = await Promise.all(dietLogs.map(async (log) => ({
    ...log,
    photoUrl: log.photo_path ? await createMealPhotoSignedUrl(client, log.photo_path) : null,
  })));
  return { checkin, workouts, dietLogs: dietLogsWithUrls, feedback };
}

export async function getTraineeStreak(client, today) {
  if (client?.isLocal) return client.operations.getTraineeStreak(today);
  const user = await requireUser(client);
  const rows = assertResult(
    await client
      .from('daily_checkins')
      .select('checkin_date, status')
      .eq('trainee_id', user.id)
      .in('status', ['submitted', 'reviewed'])
      .lte('checkin_date', today)
      .order('checkin_date', { ascending: false })
      .limit(366),
    'Unable to calculate the check-in streak.',
  ) || [];
  return calculateStreak(rows, today);
}

export async function ensureDraftCheckin(client, date) {
  const user = await requireUser(client);
  const existing = assertResult(
    await client.from('daily_checkins').select('daily_checkin_id, status').eq('trainee_id', user.id).eq('checkin_date', date).maybeSingle(),
    'Unable to check the daily check-in.',
  );
  if (existing) {
    if (existing.status !== 'draft') {
      throw new AppServiceError('Your daily check-in has been submitted and is now read-only.', { code: 'CHECKIN_READ_ONLY' });
    }
    return existing;
  }

  const created = await client.from('daily_checkins').insert({
    trainee_id: user.id,
    checkin_date: date,
    status: 'draft',
  }).select('daily_checkin_id, status').single();
  if (created.error && isUniqueViolation(created.error)) {
    return assertResult(
      await client.from('daily_checkins').select('daily_checkin_id, status').eq('trainee_id', user.id).eq('checkin_date', date).single(),
      'Unable to load the check-in created by another request.',
    );
  }
  return assertResult(created, 'Unable to create the daily check-in.');
}

export async function saveWorkoutCheckin(client, date, input) {
  if (client?.isLocal) return client.operations.saveWorkoutCheckin(date, input);
  const draft = await ensureDraftCheckin(client, date);
  if (!input.workoutDayId || !['in_progress', 'completed', 'skipped'].includes(input.status)) {
    throw new AppServiceError('Invalid workout log.', { code: 'VALIDATION_ERROR' });
  }
  const timestamp = new Date().toISOString();
  return assertResult(
    await client.from('workout_checkins').upsert({
      daily_checkin_id: draft.daily_checkin_id,
      workout_day_id: input.workoutDayId,
      status: input.status,
      actual_duration_minutes: asNumberOrNull(input.actualDurationMinutes),
      trainee_notes: input.traineeNotes?.trim() || null,
      started_at: input.status === 'in_progress' ? timestamp : null,
      completed_at: input.status === 'completed' ? timestamp : null,
    }, { onConflict: 'daily_checkin_id,workout_day_id' }).select().single(),
    'Unable to save the workout log.',
  );
}

export async function saveDietLog(client, date, input) {
  if (client?.isLocal) return client.operations.saveDietLog(date, input);
  const draft = await ensureDraftCheckin(client, date);
  let photoPath = input.existingPhotoPath || null;
  let uploadedPath = null;
  try {
    if (input.photoFile) {
      uploadedPath = await uploadMealPhoto(client, draft.daily_checkin_id, input.photoFile);
      photoPath = uploadedPath;
    }
    const record = {
      daily_checkin_id: draft.daily_checkin_id,
      diet_meal_id: input.dietMealId || null,
      meal_type: input.mealType,
      actual_food: input.actualFood?.trim() || null,
      actual_calories: asNumberOrNull(input.actualCalories),
      actual_protein_g: asNumberOrNull(input.actualProteinG),
      actual_carbs_g: asNumberOrNull(input.actualCarbsG),
      actual_fat_g: asNumberOrNull(input.actualFatG),
      photo_path: photoPath,
    };
    if (!record.actual_food && !record.photo_path) {
      throw new AppServiceError('Describe your meal or upload a photo.', { code: 'VALIDATION_ERROR' });
    }
    const query = input.dietLogId
      ? client.from('diet_logs').update(record).eq('diet_log_id', input.dietLogId)
      : client.from('diet_logs').insert(record);
    const saved = assertResult(await query.select().single(), 'Unable to save the meal log.');
    if (uploadedPath && input.existingPhotoPath && input.existingPhotoPath !== uploadedPath) {
      try { await removeMealPhoto(client, input.existingPhotoPath); } catch { /* cleanup is best effort */ }
    }
    return saved;
  } catch (error) {
    if (uploadedPath) {
      try { await removeMealPhoto(client, uploadedPath); } catch { /* preserve the database error */ }
    }
    throw error;
  }
}

export async function submitDailyCheckin(client, date, traineeNotes = '') {
  if (client?.isLocal) return client.operations.submitDailyCheckin(date, traineeNotes);
  const user = await requireUser(client);
  const draft = await ensureDraftCheckin(client, date);
  const submitted = assertResult(
    await client.from('daily_checkins').update({
      status: 'submitted',
      trainee_notes: traineeNotes.trim() || null,
      submitted_at: new Date().toISOString(),
    }).eq('daily_checkin_id', draft.daily_checkin_id).eq('trainee_id', user.id).eq('status', 'draft').select().maybeSingle(),
    'Unable to submit the daily check-in.',
  );
  if (!submitted) {
    throw new AppServiceError('The check-in was not submitted. It may have changed elsewhere. Refresh and try again.', { code: 'STALE_CHECKIN' });
  }
  return submitted;
}

export async function getCoachCheckins(client, traineeIds = []) {
  if (client?.isLocal) return client.operations.getCoachCheckins(traineeIds);
  await requireUser(client);
  if (!traineeIds.length) return [];
  return assertResult(
    await client
      .from('daily_checkins')
      .select('daily_checkin_id, trainee_id, checkin_date, status, trainee_notes, submitted_at, reviewed_at')
      .in('trainee_id', traineeIds)
      .in('status', ['submitted', 'reviewed'])
      .order('checkin_date', { ascending: false })
      .limit(100),
    'Unable to load coachee check-ins.',
  ) || [];
}

export async function getCoachSummary(client, traineeIds = []) {
  if (client?.isLocal) return client.operations.getCoachSummary(traineeIds);
  const checkins = await getCoachCheckins(client, traineeIds);
  if (!checkins.length) return { checkins: [], workoutLogs: [], dietLogs: [] };
  const ids = checkins.map((item) => item.daily_checkin_id);
  const [workoutResult, dietResult] = await Promise.all([
    client.from('workout_checkins').select('workout_checkin_id, daily_checkin_id, status').in('daily_checkin_id', ids),
    client.from('diet_logs').select('diet_log_id, daily_checkin_id, meal_type, actual_calories, actual_protein_g, photo_path').in('daily_checkin_id', ids),
  ]);
  return {
    checkins,
    workoutLogs: assertResult(workoutResult, 'Unable to calculate workout completion.') || [],
    dietLogs: assertResult(dietResult, 'Unable to summarize meal logs.') || [],
  };
}

export async function submitCoachFeedback(client, dailyCheckinId, feedbackContent) {
  if (client?.isLocal) return client.operations.submitCoachFeedback(dailyCheckinId, feedbackContent);
  const user = await requireUser(client);
  if (!feedbackContent?.trim()) {
    throw new AppServiceError('Please enter your feedback.', { code: 'VALIDATION_ERROR' });
  }
  const feedback = assertResult(
    await client.from('coach_feedback').insert({
      daily_checkin_id: dailyCheckinId,
      coach_id: user.id,
      feedback_content: feedbackContent.trim(),
    }).select().single(),
    'Unable to submit coach feedback.',
  );
  const checkin = assertResult(
    await client.from('daily_checkins').select('daily_checkin_id, status, reviewed_at').eq('daily_checkin_id', dailyCheckinId).single(),
    'Feedback was saved, but the check-in status could not be refreshed.',
  );
  return { feedback, checkin };
}

// NEW: Get trainee's check-in history (past 30 days)
export async function getTraineeCheckinHistory(client, startDate, endDate) {
  if (client?.isLocal) return client.operations.getActivityHistory?.(startDate, endDate) || [];
  const user = await requireUser(client);

  const checkins = assertResult(
    await client
      .from('daily_checkins')
      .select('daily_checkin_id, checkin_date, status, trainee_notes, submitted_at, reviewed_at')
      .eq('trainee_id', user.id)
      .in('status', ['submitted', 'reviewed'])
      .gte('checkin_date', startDate)
      .lte('checkin_date', endDate)
      .order('checkin_date', { ascending: false }),
    'Unable to load check-in history.',
  ) || [];

  if (!checkins.length) return [];

  const ids = checkins.map((c) => c.daily_checkin_id);
  const [workouts, feedback] = await Promise.all([
    client.from('workout_checkins').select('daily_checkin_id, status, actual_duration_minutes').in('daily_checkin_id', ids),
    client.from('coach_feedback').select('daily_checkin_id, feedback_content').in('daily_checkin_id', ids),
  ]);

  const workoutMap = new Map();
  (assertResult(workouts, '') || []).forEach((w) => {
    if (!workoutMap.has(w.daily_checkin_id)) workoutMap.set(w.daily_checkin_id, []);
    workoutMap.get(w.daily_checkin_id).push(w);
  });

  const feedbackMap = new Map();
  (assertResult(feedback, '') || []).forEach((f) => {
    if (!feedbackMap.has(f.daily_checkin_id)) feedbackMap.set(f.daily_checkin_id, []);
    feedbackMap.get(f.daily_checkin_id).push(f);
  });

  return checkins.map((c) => ({
    ...c,
    workouts: workoutMap.get(c.daily_checkin_id) || [],
    feedback: feedbackMap.get(c.daily_checkin_id) || [],
  }));
}
