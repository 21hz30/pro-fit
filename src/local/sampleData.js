import { addDays, createBasketballWeek, weekStart } from '../domain/training.js';

// One-time, additive upgrade. Never replace a user's plan, check-in, or notes.
export function addSampleData(state, today, serializePlan) {
  if (state.sampleDataVersion === 1) return false;
  const id = () => ++state.sequence;
  const coachId = 'demo-coach';
  const students = [
    ['demo-athlete', 'Michael'], ['sample-jordan', 'Jordan Lee'],
    ['sample-avery', 'Avery Brooks'], ['sample-sam', 'Sam Rivera'],
  ];
  if (!state.profiles.some((p) => p.id === coachId) || !state.profiles.some((p) => p.id === 'demo-athlete')) return false;
  for (const [studentId, name] of students) {
    let student = state.profiles.find((p) => p.id === studentId);
    if (!student) {
      student = { id: studentId, display_name: name, role: 'trainee', status: 'active', email: `${studentId}@profit.local` };
      state.profiles.push(student);
    }
    student.is_sample = true;
    if (!state.relationships.some((r) => r.coach_id === coachId && r.trainee_id === studentId)) {
      state.relationships.push({ coach_trainee_id: id(), coach_id: coachId, trainee_id: studentId, is_primary: true, started_at: `${addDays(today, -14)}T12:00:00Z` });
    }
    for (const offset of [-14, -7, 0]) {
      const input = createBasketballWeek(addDays(today, offset), studentId);
      if (!state.plans.some((p) => p.trainee_id === studentId && p.status !== 'draft' && p.start_date <= input.endDate && p.end_date >= input.startDate)) {
        const plan = serializePlan(state, input, coachId);
        Object.assign(plan, { status: 'published', published_at: `${input.startDate}T12:00:00Z`, is_sample: true });
        state.plans.push(plan);
      }
    }
    const studentIndex = students.findIndex(([key]) => key === studentId);
    for (let ago = 14; ago >= 1; ago--) {
      const date = addDays(today, -ago);
      if ((ago + studentIndex) % 6 === 0 || state.checkins.some((c) => c.trainee_id === studentId && c.checkin_date === date)) continue;
      const day = state.plans.filter((p) => p.trainee_id === studentId && p.status !== 'draft').flatMap((p) => p.days).find((d) => d.scheduled_date === date);
      if (!day) continue;
      const rest = (ago + studentIndex) % 4 === 0;
      const tired = (ago + studentIndex) % 5 === 0;
      const checkinId = id();
      const reviewed = ago > 2;
      state.checkins.push({ daily_checkin_id: checkinId, trainee_id: studentId, checkin_date: date, status: reviewed ? 'reviewed' : 'submitted', is_sample: true,
        trainee_notes: tired ? 'A lot of homework tonight. I chose a shorter session and an earlier bedtime.' : rest ? 'Kept today light and made time for recovery.' : 'Finished a manageable session after school. Ready to review with my coach.',
        wellness: { sleepHours: tired ? 6.5 : 8 + ((ago + studentIndex) % 3) * 0.5, fatigue: tired ? 4 : 2, sorenessArea: rest ? 'Legs' : '', sorenessLevel: rest ? 3 : 0, painArea: '', painLevel: 0, feeling: tired ? 'Exam prep took more energy today.' : 'Feeling steady. Keeping the routine realistic.', zone2Minutes: rest ? 15 : 20, zone2Rpe: rest ? 2 : 3 },
        submitted_at: `${date}T20:00:00Z`, reviewed_at: reviewed ? `${date}T21:00:00Z` : null });
      state.workouts.push({ workout_checkin_id: id(), daily_checkin_id: checkinId, workout_day_id: day.workout_day_id, title: day.title, status: rest ? 'skipped' : 'completed', actual_duration_minutes: rest ? 0 : tired ? 20 : 40, trainee_notes: rest ? 'Rest day. No make-up session needed.' : 'Shortened the plan to fit the day.', is_sample: true });
      state.meals.push({ diet_log_id: id(), daily_checkin_id: checkinId, diet_meal_id: null, meal_type: 'lunch', actual_food: ago % 2 ? 'Rice bowl with chicken, vegetables, and fruit' : 'Bean burrito, yogurt, and an apple', actual_calories: null, actual_protein_g: null, actual_carbs_g: null, actual_fat_g: null, photo_path: null, logged_at: `${date}T12:00:00Z`, is_sample: true });
      if (reviewed) state.feedback.push({ feedback_id: id(), daily_checkin_id: checkinId, coach_id: coachId, feedback_content: tired ? 'Good call adapting to your workload. Prioritize sleep tonight; we can revisit the next session together.' : rest ? 'Thanks for logging recovery. Rest belongs in the plan. Let me know how your legs feel tomorrow.' : 'Keep choosing a session you can repeat comfortably. Bring any technique questions to our next practice.', created_at: `${date}T21:00:00Z`, is_sample: true });
    }
    for (let offset = 0; offset < 7; offset++) {
      const date = addDays(weekStart(today), offset);
      if (state.diets.some((d) => d.trainee_id === studentId && d.scheduled_date === date)) continue;
      const planId = id();
      state.diets.push({ diet_plan_id: planId, coach_id: coachId, trainee_id: studentId, scheduled_date: date, status: 'published', is_sample: true, coach_notes: 'Flexible meal ideas, not a calorie prescription. Adjust portions to hunger, activity, allergies, and individual guidance.', target_calories: null, target_protein_g: null, target_carbs_g: null, target_fat_g: null,
        meals: [['breakfast', 'Oatmeal, yogurt & berries', 'Start the school day with a meal you enjoy.'], ['lunch', 'Chicken or tofu rice bowl', 'Include a protein source, grains, and colorful vegetables.'], ['snack', 'Banana & nut or seed butter', 'An easy option when there is a long gap before dinner. Adapt for allergies.'], ['dinner', 'Pasta, beans & vegetables', 'Refuel after practice and make time to eat.']].map(([meal_type, meal_name, meal_details], i) => ({ diet_meal_id: id(), diet_plan_id: planId, meal_type, meal_name, meal_details, sort_order: i + 1 })) });
    }
  }
  state.profiles.find((p) => p.id === coachId).is_sample = true;
  state.sampleDataVersion = 1;
  return true;
}
