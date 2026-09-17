import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { getCoachRoster } from '../services/profileService.js';
import { saveDietPlan } from '../services/dietService.js';
import { getLocalDateString } from '../utils/date.js';
import {
  Button, Field, PageState, SelectField, TextAreaField, Toast,
} from '../components/ui.jsx';

const initialMeals = [
  { mealType: 'breakfast', mealName: '', mealDetails: '' },
  { mealType: 'lunch', mealName: '', mealDetails: '' },
  { mealType: 'dinner', mealName: '', mealDetails: '' },
  { mealType: 'snack', mealName: '', mealDetails: '' },
];

export function DietAssignment({ requestedTraineeId }) {
  const { client } = useAuth(); const today = useMemo(() => getLocalDateString(), []);
  const [roster, setRoster] = useState([]); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ dietPlanId: null, traineeId: requestedTraineeId || '', scheduledDate: today, targetCalories: '', targetProteinG: '', targetCarbsG: '', targetFatG: '', coachNotes: '', meals: initialMeals });
  const [busy, setBusy] = useState(false); const [published, setPublished] = useState(false); const [toast, setToast] = useState(null);
  useEffect(() => {
    let active = true;
    getCoachRoster(client).then((nextRoster) => { if (active) { setRoster(nextRoster); setForm((current) => ({ ...current, traineeId: current.traineeId || nextRoster[0]?.id || '' })); } }).catch((error) => { if (active) setLoadError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client]);
  function updateMeal(index, patch) { setForm((current) => ({ ...current, meals: current.meals.map((meal, position) => position === index ? { ...meal, ...patch } : meal) })); }
  async function save(publish) {
    setBusy(true);
    try { const result = await saveDietPlan(client, form, { publish }); setForm((current) => ({ ...current, dietPlanId: result.dietPlanId })); setPublished(publish); setToast({ message: publish ? 'Nutrition plan published.' : 'Nutrition draft saved.' }); } catch (error) { setToast({ message: error.message, tone: 'error' }); } finally { setBusy(false); }
  }
  if (loading) return <div className="page"><PageState title="Loading diet workspace" /></div>;
  if (loadError) return <div className="page"><PageState icon="warning" title="Unable to load coachees" message={loadError} /></div>;
  if (!roster.length) return <div className="page"><PageState icon="person_search" title="No coachees yet" message="You can assign nutrition plans after coachees register." /></div>;
  const trainee = roster.find((item) => item.id === form.traineeId);
  return <div className="page diet-page"><header className="assignment-title"><div><span>Diet Assignment</span><h1>Assign Diet Plan{trainee ? <> to <em>{trainee.display_name}</em></> : null}</h1></div><div><Button variant="outline" busy={busy} disabled={published} onClick={() => save(false)}>Save Draft</Button><Button icon="send" busy={busy} disabled={published} onClick={() => save(true)}>Publish Plan</Button></div></header><div className="diet-layout"><section className="target-panel"><div>Daily Targets</div><SelectField label="Coachee" value={form.traineeId} disabled={Boolean(form.dietPlanId)} onChange={(event) => setForm({ ...form, traineeId: event.target.value })}>{roster.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</SelectField><Field label="Scheduled date" type="date" value={form.scheduledDate} disabled={Boolean(form.dietPlanId)} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} /><Field label="Calories (kcal)" type="number" min="0" value={form.targetCalories} onChange={(event) => setForm({ ...form, targetCalories: event.target.value })} /><Field label="Protein (g)" type="number" min="0" step="0.1" value={form.targetProteinG} onChange={(event) => setForm({ ...form, targetProteinG: event.target.value })} /><Field label="Carbs (g)" type="number" min="0" step="0.1" value={form.targetCarbsG} onChange={(event) => setForm({ ...form, targetCarbsG: event.target.value })} /><Field label="Fats (g)" type="number" min="0" step="0.1" value={form.targetFatG} onChange={(event) => setForm({ ...form, targetFatG: event.target.value })} /></section><div className="meal-plan">{form.meals.map((meal, index) => <section className="meal-editor" key={meal.mealType}><header><span>{meal.mealType}</span></header><Field label="Meal name" value={meal.mealName} onChange={(event) => updateMeal(index, { mealName: event.target.value })} placeholder="Meal name" /><textarea value={meal.mealDetails} onChange={(event) => updateMeal(index, { mealDetails: event.target.value })} placeholder="Enter meal details…" aria-label={`${meal.mealType} meal details`} /></section>)}<section className="meal-editor meal-editor--feedback"><header><span>Coach Notes &amp; Tips</span></header><textarea value={form.coachNotes} onChange={(event) => setForm({ ...form, coachNotes: event.target.value })} placeholder="Hydration, preparation or adherence guidance…" /></section></div></div>{toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}</div>;
}

