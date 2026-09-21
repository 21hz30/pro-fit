import { addDays, recoveryAdvice } from './training.js';

export function calculateCoachMetrics(summary, today) {
  const start = addDays(today, -6);
  const recentCheckins = summary.checkins.filter((row) => row.checkin_date >= start && row.checkin_date <= today);
  const recentIds = new Set(recentCheckins.map((row) => row.daily_checkin_id));
  const recentWorkouts = summary.workoutLogs.filter((row) => recentIds.has(row.daily_checkin_id));
  const recentMeals = summary.dietLogs.filter((row) => recentIds.has(row.daily_checkin_id));
  const latest = new Map();
  for (const row of recentCheckins) {
    if (!latest.has(row.trainee_id) || row.checkin_date > latest.get(row.trainee_id).checkin_date) latest.set(row.trainee_id, row);
  }
  const wellnessRows = [...latest.values()].filter((row) => row.wellness);
  const average = (rows, field) => {
    const values = rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))).map(Number);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  };
  const responseHours = recentCheckins.filter((row) => row.status === 'reviewed').map((row) => (Date.parse(row.reviewed_at) - Date.parse(row.submitted_at)) / 3600000).filter((hours) => Number.isFinite(hours) && hours >= 0);
  return {
    recentCheckins, recentMeals, wellnessRows,
    activeCount: latest.size,
    recoveryAlerts: wellnessRows.filter((row) => recoveryAdvice(row.wellness).tone !== 'normal'),
    poorSleepCount: wellnessRows.filter((row) => row.wellness.sleepHours != null && row.wellness.sleepHours !== '' && Number(row.wellness.sleepHours) < 7).length,
    highFatigueCount: wellnessRows.filter((row) => Number(row.wellness.fatigue) >= 4).length,
    recentCompletionRate: recentWorkouts.length ? Math.round(100 * recentWorkouts.filter((row) => row.status === 'completed').length / recentWorkouts.length) : null,
    avgCaloriesPerLog: average(summary.dietLogs, 'actual_calories'),
    avgProteinPerLog: average(summary.dietLogs, 'actual_protein_g'),
    photoCount: summary.dietLogs.filter((row) => row.photo_path || row.photoUrl).length,
    avgResponseHours: responseHours.length ? Math.round(responseHours.reduce((sum, value) => sum + value, 0) / responseHours.length * 10) / 10 : null,
  };
}
