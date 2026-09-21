import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { getCoachPlans } from '../services/workoutService.js';
import { getCoachRoster } from '../services/profileService.js';
import { TrainingPrinciples, TrainingWeek } from '../components/TrainingWeek.jsx';
import { Button, PageState, SelectField } from '../components/ui.jsx';
import { getLocalDateString } from '../utils/date.js';

export function TrainingSchedule({ navigate }) {
  const { client } = useAuth();
  const [roster, setRoster] = useState([]); const [trainee, setTrainee] = useState('');
  const [plans, setPlans] = useState([]); const [date, setDate] = useState(getLocalDateString);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getCoachRoster(client).then((rows) => { if (active) { setRoster(rows); setTrainee(rows[0]?.id || ''); } }).catch((next) => { if (active) setError(next.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client]);
  useEffect(() => {
    if (!trainee) return;
    let active = true; setLoading(true); setError('');
    getCoachPlans(client, trainee).then((rows) => { if (active) setPlans(rows); }).catch((next) => { if (active) setError(next.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, trainee]);
  const days = plans.filter((plan) => plan.status !== 'draft').flatMap((plan) => plan.days);
  const day = days.find((item) => item.scheduled_date === date);
  return <div className="page schedule-page"><header className="assignment-title"><div><span>COACH · WEEKLY SCHEDULE</span><h1>Weekly Schedule</h1></div><Button onClick={() => navigate(`workout?trainee=${trainee}`)}>Assign / Edit Workout</Button></header>
    <SelectField label="Coachee" value={trainee} onChange={(event) => setTrainee(event.target.value)}>{roster.map((person) => <option key={person.id} value={person.id}>{person.display_name}</option>)}</SelectField>
    {error ? <PageState icon="warning" title="Unable to load plans" message={error} /> : loading ? <PageState title="Loading weekly schedule" /> : <><TrainingWeek date={date} onSelect={setDate} days={days} /><TrainingPrinciples />{day ? <section className="schedule-detail"><h2>{day.title}</h2><p>Estimated total: {day.estimated_duration_minutes} minutes. Sessions can be split throughout the day.</p>{day.items.map((item) => <article key={item.workout_item_id}><strong>{item.exercise.exercise_name}</strong><span>{item.duration_seconds ? `${item.duration_seconds / 60} min` : `${item.sets} sets × ${item.reps_min}–${item.reps_max} reps`}</span><p>{item.instructions}</p></article>)}</section> : <PageState icon="calendar_today" title="No published plan for this day" message="Choose a coachee to assign a workout, or view another date." />}</>}
  </div>;
}
