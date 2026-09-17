import { getLocalDateString } from '../utils/date.js';

export function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + amount);
  return getLocalDateString(value);
}

export function weekStart(date = getLocalDateString()) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return addDays(date, -((weekday + 6) % 7));
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const TRAINING_GUIDANCE = {
  zone2: 'Use your individually tested Zone 2 range when available. Otherwise, use a comfortable pace where you can speak in full sentences, around 2–4/10 effort, as a practical guide. Choose brisk walking or cycling. High-intensity basketball does not count as Zone 2.',
  recovery: '45 minutes is a flexible target, not a requirement. Split it into 20 and 25 minutes if helpful. On basketball days, schedule cardio separately. On strength days, prioritize lifting quality: separate sessions or do cardio afterward. Beginners can start with 15–20 minutes. Reduce volume when tired or short on sleep. Stop movements that cause pain and tell your coach. Rest days still count as check-ins.',
  strength: 'Three-day split: push on Monday, legs and core on Wednesday, pull on Friday. Warm up for 5–10 minutes and learn each movement before adding weight. Leave 2–3 reps in reserve and rest 60–120 seconds between sets. Increase weight slightly after reaching the top of the rep range with good form in two consecutive sessions. Teens should train with qualified supervision and avoid max-weight testing.',
};

function item(name, kind, { sets = 1, repsMin = '', repsMax = '', minutes = '', rest = '', equipment = '', notes = '' } = {}) {
  return {
    key: name, exerciseId: '', newExerciseName: name, description: notes, equipment,
    sets: String(sets), repsMin: String(repsMin), repsMax: String(repsMax), targetWeight: '', weightUnit: 'kg',
    durationSeconds: minutes ? String(minutes * 60) : '', restSeconds: String(rest), instructions: notes, trainingKind: kind,
  };
}

function strength(name, notes, equipment, repsMin = 8, repsMax = 12, sets = 2) {
  return item(name, 'strength', { sets, repsMin, repsMax, rest: 90, equipment, notes: `${notes} Leave 2–3 reps in reserve. Prioritize good form.` });
}

const split = {
  0: [strength('Dumbbell Bench Press / Push-Up', 'Build upper-body pushing strength. Keep your shoulder blades stable and avoid shrugging.', 'Dumbbells or bodyweight'), strength('Half-Kneeling Single-Arm Press', 'Keep your torso steady. Avoid arching your lower back to lift the weight.', 'Light dumbbells', 8, 10), strength('Cable Triceps Pressdown / Close-Grip Push-Up', 'Keep your elbows steady and return slowly.', 'Cable machine or bodyweight', 10, 12)],
  2: [strength('Goblet Squat', 'Bend at your hips and knees, tracking your knees over your toes. Use a depth you can control.', 'Light dumbbells', 8, 10), strength('Dumbbell Romanian Deadlift', 'Push your hips back and keep your spine neutral to build hip-extension strength.', 'Light dumbbells', 8, 10), strength('Split Squat', 'Use equal reps on each side. Start with bodyweight to build balance.', 'Bodyweight', 6, 8), strength('Dead Bug', 'Alternate sides slowly while keeping your lower back stable.', 'Exercise mat', 6, 10)],
  4: [strength('Chest-Supported Dumbbell Row', 'Build upper-body pulling strength without compensating through your lower back.', 'Dumbbells and bench'), strength('Lat Pulldown / Resistance Band Pulldown', 'Pull within a comfortable shoulder range. Avoid swinging your body.', 'Cable machine or resistance band'), strength('Resistance Band Face Pull', 'Use light resistance and controlled shoulder-blade movement.', 'Resistance band', 12, 15)],
};

export function createBasketballWeek(date, traineeId = '') {
  const start = weekStart(date);
  const titles = ['Push · Upper Body', 'Basketball · Skills & Footwork', 'Legs & Core · Stability', 'Cardio & Recovery', 'Pull · Upper Body', 'Basketball · Team Play', 'Cardio & Recovery'];
  return {
    workoutPlanId: null, traineeId, planName: 'Basketball Foundation · 7-Day Plan', goal: 'Build aerobic fitness, strength, and quality movement on the court',
    startDate: start, endDate: addDays(start, 6),
    coachNotes: `${TRAINING_GUIDANCE.strength}\n${TRAINING_GUIDANCE.recovery}`,
    days: titles.map((title, index) => {
      const basketball = index === 1 || index === 5;
      const items = [item('Zone 2 Cardio', 'zone2', { minutes: 45, equipment: 'Cycling / Brisk walking', notes: TRAINING_GUIDANCE.zone2 })];
      if (split[index]) items.push(item('Dynamic Warm-Up', 'warmup', { minutes: 8, notes: 'Start with easy movement, mobilize your hips, ankles, and shoulders, then complete light warm-up sets.' }), ...structuredClone(split[index]));
      if (basketball) items.push(item(index === 1 ? 'Basketball A · Skills & Footwork' : 'Basketball B · Team Play & Scrimmage', 'basketball', { minutes: 75, equipment: 'Basketball / Court', notes: index === 1 ? '10 min dynamic warm-up → 20 min ball handling and footwork → 20 min shooting → 15 min small-group drills → 10 min cooldown. Your coach adjusts the intensity.' : '10 min warm-up → 20 min passing and cutting → 20 min team tactics → 15 min controlled scrimmage → 10 min cooldown. Reduce additional training during game weeks.' }));
      if (!split[index] && !basketball) items.push(item('Easy Movement & Mobility', 'recovery', { minutes: 10, notes: 'Gently mobilize your hips, ankles, and upper back without painful stretching. This is a recovery day with no strength or basketball session.' }));
      return { key: `day-${index}`, scheduledDate: addDays(start, index), title, estimatedDurationMinutes: String(basketball ? 120 : split[index] ? 90 : 55), items };
    }),
  };
}

export const EMPTY_WELLNESS = Object.freeze({ sleepHours: '', fatigue: '', sorenessArea: '', sorenessLevel: '', painLevel: '', painArea: '', feeling: '', zone2Minutes: '', zone2Rpe: '' });

export function validateWellness(input) {
  const result = { ...EMPTY_WELLNESS, ...input };
  for (const [key, min, max, whole] of [['sleepHours', 0, 24, false], ['fatigue', 1, 5, true], ['sorenessLevel', 0, 10, true], ['painLevel', 0, 10, true], ['zone2Minutes', 0, 240, true], ['zone2Rpe', 0, 10, true]]) {
    const value = result[key];
    if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max || (whole && !Number.isInteger(Number(value)))) throw new Error('Complete all recovery and cardio fields using values within the allowed ranges. Enter 0 minutes if you rested.');
    result[key] = Number(value);
  }
  for (const key of ['sorenessArea', 'painArea', 'feeling']) result[key] = String(result[key] || '').trim().slice(0, 1000);
  if (result.sorenessLevel > 0 && !result.sorenessArea) throw new Error('Enter the area of muscle soreness.');
  if (result.painLevel > 0 && !result.painArea) throw new Error('Enter the area of pain or discomfort so your coach can adjust your training.');
  if (!result.feeling) throw new Error('Add a short reflection on your training or recovery today.');
  return result;
}

// Practical prompts for a coaching conversation, not a diagnostic readiness score.
export function recoveryAdvice(wellness = {}) {
  if (wellness.painLevel !== '' && Number(wellness.painLevel) > 0) return { tone: 'pain', title: 'Address discomfort before training', message: 'Stop movements that cause pain and tell your coach. Seek professional evaluation if pain persists or worsens. Do not push through pain to reach the 45-minute target.' };
  if ((wellness.sleepHours !== '' && wellness.sleepHours != null && Number(wellness.sleepHours) < 7) || Number(wellness.fatigue) >= 4 || Number(wellness.sorenessLevel) >= 6 || Number(wellness.zone2Rpe) > 4) return { tone: 'reduce', title: 'Prioritize recovery and reduce volume today', message: 'Shorten or skip extra cardio and reduce strength sets. If you cannot talk comfortably during cardio, lower the pace or resistance. Adjust with your coach; you do not need to make up missed volume.' };
  return { tone: 'normal', title: 'Let your body guide the pace', message: 'Check how you feel after warming up and prioritize good form. Adults generally need 7–9 hours of sleep and teens 8–10 hours. These logs support coaching conversations, not medical assessments.' };
}
