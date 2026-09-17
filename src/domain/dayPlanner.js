export function validateDayPlan(input) {
  const minutes = Number(input.availableMinutes);
  if (input.availableMinutes === '' || !Number.isInteger(minutes) || minutes < 0 || minutes > 180) throw new Error('Choose between 0 and 180 available minutes.');
  if (!['light', 'normal', 'heavy'].includes(input.schoolLoad)) throw new Error('Choose your school workload.');
  if (!['ready', 'tired', 'pain'].includes(input.energy)) throw new Error('Choose how you feel today.');
  return { availableMinutes: minutes, schoolLoad: input.schoolLoad, energy: input.energy };
}

// Conservative planning support, not an exercise prescription or readiness score.
export function suggestDay(input, wellness, scheduledMinutes = 0) {
  const plan = validateDayPlan(input);
  const hasPain = plan.energy === 'pain' || Number(wellness?.painLevel) > 0;
  const shortSleep = wellness?.sleepHours != null && wellness.sleepHours !== '' && Number(wellness.sleepHours) < 8;
  const reduced = plan.energy === 'tired' || plan.schoolLoad === 'heavy' || shortSleep || Number(wellness?.fatigue) >= 4 || Number(wellness?.sorenessLevel) >= 6 || Number(wellness?.zone2Rpe) > 4;
  if (hasPain) return { tone: 'rest', title: 'Pause and talk to your coach', minutes: 0, reason: 'Pain changes the plan. Stop movements that cause discomfort and tell a trusted adult or coach. Seek qualified care for persistent or concerning symptoms.', steps: ['Make recovery the priority today.', 'Share where it hurts in your recovery check-in.', 'Keep meals and bedtime consistent.'] };
  if (plan.availableMinutes < 10 || plan.energy === 'tired' && plan.schoolLoad === 'heavy') return { tone: 'rest', title: 'Make room for recovery', minutes: 0, reason: 'A busy or low-energy day can be a rest day. There is no missed-workout debt to repay.', steps: ['Log how you feel and let your coach know.', 'Make time for a regular meal and water.', 'Protect your sleep window tonight.'] };
  const minutes = Math.min(plan.availableMinutes, reduced ? 20 : 45, scheduledMinutes > 0 ? scheduledMinutes : 30);
  return { tone: reduced ? 'easy' : 'steady', title: reduced ? 'Keep it short and easy' : 'A session that fits your day', minutes, reason: reduced ? 'Your school workload or recovery suggests a lighter option. Discuss any change to your assigned session with your coach.' : 'Use this time budget to agree on a manageable session with your coach. You do not need to fill every available minute.', steps: [`Reserve ${Math.min(5, minutes)} minutes for an easy warm-up.`, reduced ? 'Choose comfortable movement; avoid adding hard intervals.' : 'Prioritize the main skill or movement in your coach’s plan.', 'Leave a few minutes to cool down, eat, and return to schoolwork.'] };
}
