import { createBasketballWeek, weekStart, addDays } from '../domain/training.js';
import { TrainingPrinciples } from '../components/TrainingWeek.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { getCoachRoster } from '../services/profileService.js';
import { getCoachExercises, saveWorkoutPlan } from '../services/workoutService.js';
import { getLocalDateString } from '../utils/date.js';
import {
  Button, Field, Icon, initials, PageState, SelectField, TextAreaField, Toast,
} from '../components/ui.jsx';

function plusDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`); date.setDate(date.getDate() + days); return getLocalDateString(date);
}
function newItem() { return { key: globalThis.crypto?.randomUUID?.() || String(Math.random()), exerciseId: '', newExerciseName: '', sets: '3', repsMin: '8', repsMax: '10', targetWeight: '', weightUnit: 'kg', durationSeconds: '', restSeconds: '90', instructions: '', equipment: '' }; }
function newDay(date, index = 0) { return { key: globalThis.crypto?.randomUUID?.() || String(Math.random()), title: '', scheduledDate: plusDays(date, index), estimatedDurationMinutes: '45', items: [newItem()] }; }

export function WorkoutAssignment({ requestedTraineeId }) {
  const { client } = useAuth(); const today = useMemo(() => getLocalDateString(), []);
  const [roster, setRoster] = useState([]); const [library, setLibrary] = useState([]); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState('');
  const [plan, setPlan] = useState({ workoutPlanId: null, traineeId: requestedTraineeId || '', planName: '', goal: '', coachNotes: '', startDate: today, endDate: plusDays(today, 7), days: [newDay(today)] });
  const [savedPlans, setSavedPlans] = useState([]);
  const [busy, setBusy] = useState(false); const [published, setPublished] = useState(false); const [toast, setToast] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([getCoachRoster(client), getCoachExercises(client)]).then(([nextRoster, exercises]) => {
      if (!active) return; setRoster(nextRoster); setLibrary(exercises); setPlan((current) => ({ ...current, traineeId: current.traineeId || nextRoster[0]?.id || '' }));
    }).catch((error) => { if (active) setLoadError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client]);


  useEffect(() => {
    if (!client.isLocal || !plan.traineeId) return;
    let active = true;
    client.operations.getCoachPlans(plan.traineeId).then((rows) => { if (active) setSavedPlans(rows); }).catch((error) => { if (active) setToast({ message: error.message, tone: 'error' }); });
    return () => { active = false; };
  }, [client, plan.traineeId, plan.workoutPlanId, published]);

  function useTemplate() {
    setPlan(createBasketballWeek(plan.startDate || today, plan.traineeId)); setPublished(false);
    setToast({ message: 'Your 7-day template is ready. Review dates, intensity, and exercises before publishing.' });
  }
  function loadSaved(value) {
    const saved = savedPlans.find((row) => String(row.workout_plan_id) === value);
    if (!saved) return;
    setPublished(false);
    setPlan({ workoutPlanId: saved.workout_plan_id, traineeId: saved.trainee_id, planName: saved.plan_name, goal: saved.goal, coachNotes: saved.coach_notes, startDate: saved.start_date, endDate: saved.end_date, days: saved.days.map((day) => ({ key: day.workout_day_id, title: day.title, scheduledDate: day.scheduled_date, estimatedDurationMinutes: day.estimated_duration_minutes, items: day.items.map((item) => ({ key: item.workout_item_id, exerciseId: item.exercise_id, newExerciseName: item.exercise.exercise_name, sets: item.sets, repsMin: item.reps_min ?? '', repsMax: item.reps_max ?? '', targetWeight: item.target_weight ?? '', weightUnit: item.weight_unit || 'kg', durationSeconds: item.duration_seconds ?? '', restSeconds: item.rest_seconds ?? '', instructions: item.instructions || '', trainingKind: item.training_kind })) })) });
  }

  function updateDay(dayIndex, patch) { setPlan((current) => ({ ...current, days: current.days.map((day, index) => index === dayIndex ? { ...day, ...patch } : day) })); }
  function updateItem(dayIndex, itemIndex, patch) { setPlan((current) => ({ ...current, days: current.days.map((day, index) => index === dayIndex ? { ...day, items: day.items.map((item, position) => position === itemIndex ? { ...item, ...patch } : item) } : day) })); }
  function removeItem(dayIndex, itemIndex) { updateDay(dayIndex, { items: plan.days[dayIndex].items.filter((_, index) => index !== itemIndex) }); }
  async function save(publish) {
    setBusy(true);
    try {
      const result = await saveWorkoutPlan(client, plan, { publish });
      setPlan((current) => ({ ...current, workoutPlanId: result.workoutPlanId })); setPublished(publish);
      setToast({ message: publish ? 'Workout plan published.' : 'Workout draft saved.' });
      if (publish) setLibrary(await getCoachExercises(client));
    } catch (error) { setToast({ message: error.message, tone: 'error' }); } finally { setBusy(false); }
  }

  if (loading) return <div className="page"><PageState title="Loading assignment workspace" /></div>;
  if (loadError) return <div className="page"><PageState icon="warning" title="Unable to load assignment data" message={loadError} /></div>;
  const trainee = roster.find((item) => item.id === plan.traineeId);
  if (!roster.length) return <div className="page"><PageState icon="person_search" title="No coachees yet" message="You can assign workouts after coachees register." /></div>;

  return <div className="page assignment-page"><header className="assignment-title"><div><span>COACH WORKSPACE</span><h1>Assign Workout Plan{trainee ? <> to <em>{trainee.display_name}</em></> : null}</h1></div><div><Button variant="outline" busy={busy} disabled={published} onClick={() => save(false)}>Save Draft</Button><Button icon="send" busy={busy} disabled={published} onClick={() => save(true)}>Publish Plan</Button></div></header>
    <section className="template-card"><div><span className="eyebrow">BASKETBALL FOUNDATION</span><h2>7-Day Basketball Training Template</h2><p>45 min of Zone 2 daily · Mon push / Wed legs and core / Fri pull · Basketball on Tue and Sat</p><small>Generated for the week of your start date. Adjust durations, exercises, and dates as needed.</small></div><Button variant="outline" disabled={busy} onClick={useTemplate}>Load Basketball Template</Button><Button variant="outline" disabled={busy} onClick={() => { setPlan(createBasketballWeek(addDays(weekStart(plan.startDate || today), 7), plan.traineeId)); setPublished(false); }}>Create Next Week</Button></section>
    <TrainingPrinciples />
    {client.isLocal && savedPlans.length ? <SelectField className="saved-plan-select" label="Reopen a saved plan (logged plans are kept as history)" value="" onChange={(event) => loadSaved(event.target.value)}><option value="">Choose a saved plan…</option>{savedPlans.map((saved) => <option key={saved.workout_plan_id} value={saved.workout_plan_id}>{saved.start_date} · {saved.plan_name} · {saved.status === 'draft' ? 'Draft' : 'Published'}</option>)}</SelectField> : null}
    {published ? <div className="readonly-banner"><Icon name="check_circle" /><strong>Published</strong><span>Your coachee can now view this plan. Reopen it to edit, or create next week.</span></div> : null}
    <div className="assignment-layout"><fieldset disabled={published || busy} className="assignment-content assignment-fieldset"><section className="form-panel"><div className="form-panel__title">Plan Details</div><div className="plan-fields"><SelectField label="Coachee" value={plan.traineeId} disabled={Boolean(plan.workoutPlanId)} onChange={(event) => setPlan({ ...plan, traineeId: event.target.value })}>{roster.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</SelectField><Field label="Plan Name" value={plan.planName} onChange={(event) => setPlan({ ...plan, planName: event.target.value })} placeholder="PLAN NAME" /><Field label="Primary Goal" value={plan.goal} onChange={(event) => setPlan({ ...plan, goal: event.target.value })} placeholder="STRENGTH, ENDURANCE…" /><Field label="Start Date" type="date" value={plan.startDate} onChange={(event) => setPlan({ ...plan, startDate: event.target.value })} /><Field label="End Date" type="date" value={plan.endDate} onChange={(event) => setPlan({ ...plan, endDate: event.target.value })} /><TextAreaField label="Coach Notes" className="field--wide" value={plan.coachNotes} onChange={(event) => setPlan({ ...plan, coachNotes: event.target.value })} /></div></section>
      {plan.days.map((day, dayIndex) => <section className="form-panel workout-day" key={day.key}><div className="form-panel__title">Day {dayIndex + 1}: {day.title || 'Untitled'}<button className="icon-button" disabled={plan.days.length === 1} onClick={() => setPlan({ ...plan, days: plan.days.filter((_, index) => index !== dayIndex) })}><Icon name="delete" /></button></div><div className="workout-day__body"><div className="compact-fields"><Field label="Day title" value={day.title} onChange={(event) => updateDay(dayIndex, { title: event.target.value })} /><Field label="Scheduled date" type="date" min={plan.startDate} max={plan.endDate} value={day.scheduledDate} onChange={(event) => updateDay(dayIndex, { scheduledDate: event.target.value })} /><Field label="Estimated minutes" type="number" min="0" value={day.estimatedDurationMinutes} onChange={(event) => updateDay(dayIndex, { estimatedDurationMinutes: event.target.value })} /></div>
        {day.items.map((item, itemIndex) => <article className="exercise-editor" key={item.key}><span className="exercise-editor__id">{itemIndex + 1}</span><div className="exercise-editor__top"><SelectField label="Existing exercise" value={item.exerciseId} onChange={(event) => updateItem(dayIndex, itemIndex, { exerciseId: event.target.value, newExerciseName: '' })}><option value="">Create a new exercise</option>{library.map((exercise) => <option key={exercise.exercise_id} value={exercise.exercise_id}>{exercise.exercise_name}</option>)}</SelectField><button className="icon-button" disabled={day.items.length === 1} onClick={() => removeItem(dayIndex, itemIndex)} aria-label="Delete exercise"><Icon name="delete" /></button></div>{!item.exerciseId ? <div className="compact-fields"><Field label="New exercise name" value={item.newExerciseName} onChange={(event) => updateItem(dayIndex, itemIndex, { newExerciseName: event.target.value })} /><Field label="Equipment" value={item.equipment} onChange={(event) => updateItem(dayIndex, itemIndex, { equipment: event.target.value })} /></div> : null}<div className="exercise-metrics"><label><span>Duration (sec, cardio / class)</span><input aria-label="Duration (seconds)" type="number" min="0" value={item.durationSeconds} onChange={(event) => updateItem(dayIndex, itemIndex, { durationSeconds: event.target.value })} /></label><label><span>Sets</span><input type="number" min="1" value={item.sets} onChange={(event) => updateItem(dayIndex, itemIndex, { sets: event.target.value })} /></label><label><span>Reps min</span><input type="number" min="0" value={item.repsMin} onChange={(event) => updateItem(dayIndex, itemIndex, { repsMin: event.target.value })} /></label><label><span>Reps max</span><input type="number" min="0" value={item.repsMax} onChange={(event) => updateItem(dayIndex, itemIndex, { repsMax: event.target.value })} /></label><label><span>Target weight</span><input className="accent-input" type="number" min="0" step="0.1" value={item.targetWeight} onChange={(event) => updateItem(dayIndex, itemIndex, { targetWeight: event.target.value })} /></label><label><span>Unit</span><select value={item.weightUnit} onChange={(event) => updateItem(dayIndex, itemIndex, { weightUnit: event.target.value })}><option value="kg">kg</option><option value="lb">lb</option></select></label><label><span>Rest seconds</span><input type="number" min="0" value={item.restSeconds} onChange={(event) => updateItem(dayIndex, itemIndex, { restSeconds: event.target.value })} /></label></div><input className="exercise-note" value={item.instructions} placeholder="Instructions…" onChange={(event) => updateItem(dayIndex, itemIndex, { instructions: event.target.value })} /></article>)}<button className="add-dashed" onClick={() => updateDay(dayIndex, { items: [...day.items, newItem()] })}><Icon name="add" /> Add Exercise</button></div></section>)}
      <Button variant="outline" icon="add_circle" onClick={() => setPlan({ ...plan, days: [...plan.days, newDay(plan.startDate, plan.days.length)] })}>Add Workout Day</Button></fieldset>
      <aside className="assignment-aside"><section className="client-banner"><div className="avatar avatar--profile">{initials(trainee?.display_name)}</div><div><strong>{trainee?.display_name}</strong><span><b>Active</b> secure relationship</span></div><Icon name="person" /></section><section className="calendar-card"><header><span>Schedule</span></header><footer><strong>{plan.startDate || 'Start'} → {plan.endDate || 'End'}</strong>{plan.days.map((day, index) => <span key={day.key}><i /> Day {index + 1}: {day.scheduledDate}</span>)}</footer></section></aside></div>
    {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
  </div>;
}

