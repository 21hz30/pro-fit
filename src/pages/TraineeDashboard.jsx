import { DayPlanner } from '../components/DayPlanner.jsx';
import { ActivityHistory } from '../components/ActivityHistory.jsx';
import { RecoveryCheckin } from '../components/RecoveryCheckin.jsx';
import { TrainingPrinciples } from '../components/TrainingWeek.jsx';
import { weekStart, addDays } from '../domain/training.js';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { getTraineeWorkout, getTraineeWeeklyPlan, getTraineeAllPlans } from '../services/workoutService.js';
import { getTraineeDiet } from '../services/dietService.js';
import {
  getDailyCheckin, getTraineeStreak, getTraineeCheckinHistory, saveDietLog, saveWorkoutCheckin, submitDailyCheckin,
} from '../services/checkinService.js';
import { getLocalDateString } from '../utils/date.js';
import {
  Button, Field, Icon, Modal, PageState, SectionHeader, SelectField, TextAreaField, Toast,
} from '../components/ui.jsx';
import { getExerciseVideo, isBasketballExercise, getYouTubeThumbnail } from '../utils/exerciseVideos.js';

function Macro({ label, actual = 0, target, unit, tone }) {
  const percent = target ? Math.min(100, Math.round((actual / Number(target)) * 100)) : 0;
  return <div className="macro"><div><span>{label}</span><span>{actual} / {target ?? '—'} {unit}</span></div><div className="macro__track"><span className={`macro__fill macro__fill--${tone}`} style={{ width: `${percent}%` }} /></div></div>;
}

function WorkoutLogModal({ day, existing, onClose, onSave }) {
  const [form, setForm] = useState({ status: existing?.status || 'completed', actualDurationMinutes: existing?.actual_duration_minutes || '', traineeNotes: existing?.trainee_notes || '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave({ ...form, workoutDayId: day.workout_day_id }); onClose(); } catch (nextError) { setError(nextError.message); } finally { setBusy(false); }
  }
  return <Modal title={`Log ${day.title}`} onClose={onClose}><form className="modal-form" onSubmit={submit}><SelectField label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="completed">Completed</option><option value="in_progress">In progress</option><option value="skipped">Skipped</option></SelectField><Field label="Actual duration (minutes)" type="number" min="0" value={form.actualDurationMinutes} onChange={(event) => setForm({ ...form, actualDurationMinutes: event.target.value })} /><TextAreaField label="Training notes" value={form.traineeNotes} onChange={(event) => setForm({ ...form, traineeNotes: event.target.value })} placeholder="How did the session feel?" />{error ? <p className="form-error" role="alert">{error}</p> : null}<Button type="submit" busy={busy}>Save workout</Button></form></Modal>;
}

function DietLogModal({ meals, onClose, onSave }) {
  const [form, setForm] = useState({ mealType: meals[0]?.meal_type || 'breakfast', dietMealId: meals[0]?.diet_meal_id || '', actualFood: '', actualCalories: '', actualProteinG: '', actualCarbsG: '', actualFatG: '', photoFile: null });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  function selectMeal(value) {
    const meal = meals.find((item) => String(item.diet_meal_id) === value);
    setForm({ ...form, dietMealId: value, mealType: meal?.meal_type || form.mealType });
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave(form); onClose(); } catch (nextError) { setError(nextError.message); } finally { setBusy(false); }
  }
  return <Modal title="Log a meal" onClose={onClose}><form className="modal-form" onSubmit={submit}>{meals.length ? <SelectField label="Planned meal" value={form.dietMealId} onChange={(event) => selectMeal(event.target.value)}>{meals.map((meal) => <option key={meal.diet_meal_id} value={meal.diet_meal_id}>{meal.meal_type}: {meal.meal_name || 'Meal'}</option>)}</SelectField> : <SelectField label="Meal type" value={form.mealType} onChange={(event) => setForm({ ...form, mealType: event.target.value })}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></SelectField>}<TextAreaField label="Actual food" value={form.actualFood} onChange={(event) => setForm({ ...form, actualFood: event.target.value })} placeholder="What did you eat?" /><div className="compact-fields"><Field label="Calories" type="number" min="0" value={form.actualCalories} onChange={(event) => setForm({ ...form, actualCalories: event.target.value })} /><Field label="Protein (g)" type="number" min="0" step="0.1" value={form.actualProteinG} onChange={(event) => setForm({ ...form, actualProteinG: event.target.value })} /><Field label="Carbs (g)" type="number" min="0" step="0.1" value={form.actualCarbsG} onChange={(event) => setForm({ ...form, actualCarbsG: event.target.value })} /><Field label="Fat (g)" type="number" min="0" step="0.1" value={form.actualFatG} onChange={(event) => setForm({ ...form, actualFatG: event.target.value })} /></div><label className="upload-drop"><Icon name="cloud_upload" /><strong>{form.photoFile ? form.photoFile.name : 'Choose a meal photo'}</strong><span>JPG, PNG or WebP · up to 8 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, photoFile: event.target.files?.[0] || null })} /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<Button type="submit" busy={busy}>Save meal log</Button></form></Modal>;
}

export function TraineeDashboard({ initialTab = 'training' }) {
  const { client, profile } = useAuth();
  const [today, setDate] = useState(getLocalDateString);
  const [recoveryDirty, setRecoveryDirty] = useState(false);
  const isFuture = today > getLocalDateString();
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [tutorial, setTutorial] = useState(null); const [workoutDay, setWorkoutDay] = useState(null); const [showDietLog, setShowDietLog] = useState(false);
  const [busySubmit, setBusySubmit] = useState(false); const [traineeNotes, setTraineeNotes] = useState(''); const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => setActiveTab(initialTab), [initialTab]);
  function selectTab(tab) {
    setActiveTab(tab);
    if (tab === 'training') window.location.hash = '/trainee';
    else if (tab === 'week') window.location.hash = '/trainee/week';
    else if (tab === 'history') window.location.hash = '/trainee/history';
    else if (tab === 'day') window.location.hash = '/day';
  }

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const localToday = getLocalDateString();
      const weekStartDate = weekStart(localToday);
      const weekEndDate = addDays(weekStartDate, 6);
      const historyStart = addDays(localToday, -30);

      const [workout, diet, checkin, streak, weeklyPlan, allPlans, history, dayPlan] = await Promise.all([
        getTraineeWorkout(client, today),
        getTraineeDiet(client, today),
        getDailyCheckin(client, today),
        getTraineeStreak(client, localToday),
        getTraineeWeeklyPlan(client, weekStartDate, weekEndDate),
        getTraineeAllPlans(client),
        getTraineeCheckinHistory(client, historyStart, localToday),
        client.isLocal ? client.operations.getDayPlan(today) : null,
      ]);

      setData({ workout, diet, checkin, streak, weeklyPlan, allPlans, history, dayPlan });
      setRecoveryDirty(false);
      setTraineeNotes(checkin.checkin?.trainee_notes || '');
    } catch (nextError) { setError(nextError.message); } finally { setLoading(false); }
  }, [client, today]);

  useEffect(() => { load(); }, [load]);

  async function saveWorkout(input) { await saveWorkoutCheckin(client, today, input); setToast({ message: 'Workout log saved.' }); await load(); }
  async function saveMeal(input) { await saveDietLog(client, today, input); setToast({ message: 'Meal log and photo saved.' }); await load(); }
  async function submitCheckin() {
    setBusySubmit(true);
    try { await submitDailyCheckin(client, today, traineeNotes); setToast({ message: 'Daily check-in submitted. Your entries are now read-only.' }); await load(); } catch (nextError) { setToast({ message: nextError.message, tone: 'error' }); } finally { setBusySubmit(false); }
  }

  if (loading) return <div className="page"><PageState title="Loading your training dashboard" message="Loading your workouts, nutrition, and check-ins." /></div>;
  if (error) return <div className="page"><PageState icon="warning" title="Dashboard unavailable" message={error} action={<Button onClick={load}>Retry</Button>} /></div>;

  const { workout, diet, checkin, streak, weeklyPlan, allPlans, history } = data;
  const isReadOnly = isFuture || ['submitted', 'reviewed'].includes(checkin.checkin?.status);
  const workoutLogs = new Map(checkin.workouts.map((item) => [item.workout_day_id, item]));
  const nutritionTotals = checkin.dietLogs.reduce((totals, log) => ({ calories: totals.calories + Number(log.actual_calories || 0), protein: totals.protein + Number(log.actual_protein_g || 0), carbs: totals.carbs + Number(log.actual_carbs_g || 0), fat: totals.fat + Number(log.actual_fat_g || 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return <>
    <div className="page trainee-page">
      <header className="welcome-header">
        <div>
          <h1>{activeTab === 'training' ? "Today's Training" : activeTab === 'week' ? 'Weekly Plan' : activeTab === 'day' ? 'My Day' : 'Training History'}</h1>
          <p>{activeTab === 'training' ? `${today} · Your coach-assigned plan for today.` : activeTab === 'week' ? 'Your training schedule for this week.' : activeTab === 'day' ? 'Fit training and recovery around school and life.' : 'Past workouts and coach feedback.'}</p>
        </div>
        <div className="streak">
          <Icon name="local_fire_department" filled />
          <div><span>Current Streak</span><strong>{streak} {streak === 1 ? 'day' : 'days'}</strong></div>
        </div>
      </header>

      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard sections">
        <button role="tab" aria-selected={activeTab === 'training'} className={activeTab === 'training' ? 'active' : ''} onClick={() => selectTab('training')}>
          <Icon name="fitness_center" />Today's Training
        </button>
        <button role="tab" aria-selected={activeTab === 'week'} className={activeTab === 'week' ? 'active' : ''} onClick={() => selectTab('week')}>
          <Icon name="calendar_view_week" />Weekly Plan
        </button>
        <button role="tab" aria-selected={activeTab === 'history'} className={activeTab === 'history' ? 'active' : ''} onClick={() => selectTab('history')}>
          <Icon name="history" />Training History
        </button>
        <button role="tab" aria-selected={activeTab === 'day'} className={activeTab === 'day' ? 'active' : ''} onClick={() => selectTab('day')}><Icon name="calendar_today" />My Day</button>
      </div>
      {activeTab === 'day' && <>
        {client.isLocal ? <DayPlanner key={today} initial={data.dayPlan} wellness={checkin.checkin?.wellness} scheduledMinutes={workout.days.reduce((sum, day) => sum + Number(day.estimated_duration_minutes || 0), 0)} readOnly={isReadOnly} onSave={(input) => client.operations.saveDayPlan(today, input)} /> : <PageState title="Daily planning is not available for this account yet" message="You can still view your training plan and share notes with your coach." />}
        <ActivityHistory records={history.filter((row) => row.checkin_date >= addDays(getLocalDateString(), -13))} isSample={profile.is_sample} onSelect={(date) => { setDate(date); selectTab('training'); }} />
      </>}

      {/* TODAY'S TRAINING TAB */}
      {activeTab === 'training' && <>
        {isReadOnly ? <div className="readonly-banner"><Icon name="check_circle" /><strong>{isFuture ? 'Future Plan Preview' : checkin.checkin.status === 'reviewed' ? 'Reviewed by Coach' : 'Submitted'}</strong><span>This record is read-only.</span></div> : null}

        <Field label="Training date" type="date" value={today} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} />
        <TrainingPrinciples />
        {client.isLocal ? <section className="panel recovery-panel"><SectionHeader>Recovery &amp; Cardio Check-in</SectionHeader><RecoveryCheckin key={today} initial={checkin.checkin?.wellness} readOnly={isReadOnly} onDirty={() => setRecoveryDirty(true)} onSave={async (input) => { const saved = await client.operations.saveWellness(today, input); setData((previous) => ({ ...previous, checkin: { ...previous.checkin, checkin: saved } })); setRecoveryDirty(false); }} /></section> : null}

        <div className="trainee-grid">
          <section className="panel workout-panel">
            <SectionHeader trailing={<span className="status-block">{workout.days.length} scheduled</span>}>Daily Workout Plan</SectionHeader>
            <div className="exercise-list">
              {workout.days.length ? workout.days.flatMap((day) => day.items.map((item, index) => {
                const exerciseName = item.exercise?.exercise_name || 'Exercise';
                const isBasketball = isBasketballExercise(exerciseName);
                return <article className="exercise-row" key={item.workout_item_id}>
                  <span className="exercise-row__number">{index + 1}</span>
                  <div>
                    <h3>{exerciseName}</h3>
                    <p>
                      {item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} min` : `${item.sets} sets · ${item.reps_min ?? '—'}${item.reps_max && item.reps_max !== item.reps_min ? `–${item.reps_max}` : ''} reps`}
                      {item.target_weight ? ` · ${item.target_weight} ${item.weight_unit}` : ''}
                      {item.rest_seconds ? ` · Rest ${item.rest_seconds} sec` : ''}
                      {item.exercise?.equipment ? ` · ${item.exercise.equipment}` : ''}
                    </p>
                    {item.instructions ? <small>{item.instructions}</small> : null}
                  </div>
                  {isBasketball ?
                    <div className="basketball-note"><Icon name="sports_basketball" /><span>See you on the court!</span></div> :
                    <Button variant="outline" icon="play_circle" onClick={() => setTutorial(item)}>Exercise Guide</Button>
                  }
                </article>;
              })) : <PageState icon="fitness_center" title="No workout scheduled" message="Your workout will appear when your coach publishes a plan. You can still log recovery on rest days." />}
            </div>
            {workout.days.map((day) => <div className="panel-action" key={day.workout_day_id}>
              <span><strong>{day.title}</strong><small>{workoutLogs.get(day.workout_day_id)?.status || 'Not logged'}</small></span>
              <Button variant="outline" disabled={isReadOnly} onClick={() => setWorkoutDay(day)}>
                {workoutLogs.has(day.workout_day_id) ? 'Edit Log' : 'Log Workout'}
              </Button>
            </div>)}
          </section>

          <section className="panel nutrition-panel">
            <SectionHeader trailing={<Icon name="restaurant_menu" />}>Nutrition Plan &amp; Log</SectionHeader>
            <div className="nutrition-panel__content">
              <section className="macro-section">
                <h3>{diet.plan?.target_calories ? 'Daily Macros' : 'Fuel for your day'}</h3>
                {diet.plan?.coach_notes ? <p className="nutrition-guidance">{diet.plan.coach_notes}</p> : null}
                <details className="nutrition-totals">
                  <summary>Nutrition totals (optional)</summary>
                  <Macro label="Calories" actual={nutritionTotals.calories} target={diet.plan?.target_calories} unit="kcal" tone="navy" />
                  <Macro label="Protein" actual={nutritionTotals.protein} target={diet.plan?.target_protein_g} unit="g" tone="orange" />
                  <Macro label="Carbs" actual={nutritionTotals.carbs} target={diet.plan?.target_carbs_g} unit="g" tone="navy" />
                  <Macro label="Fat" actual={nutritionTotals.fat} target={diet.plan?.target_fat_g} unit="g" tone="orange" />
                </details>
              </section>
              <section className="meals-section">
                <h3>Meals</h3>
                {diet.meals.length ? diet.meals.map((meal) => {
                  const logged = checkin.dietLogs.some((log) => log.diet_meal_id === meal.diet_meal_id);
                  return <div className="meal-row" key={meal.diet_meal_id}>
                    <span><Icon name={logged ? 'check_circle' : 'radio_button_unchecked'} filled={logged} /><strong>{meal.meal_type}</strong></span>
                    <span>{meal.meal_name || 'Planned meal'}{meal.meal_details ? <small className="meal-details">{meal.meal_details}</small> : null}</span>
                  </div>;
                }) : <p className="inline-empty">No nutrition plan for this date. You can still log your meals.</p>}
              </section>
              <button className="upload-box" aria-label="Log a Meal" disabled={isReadOnly} onClick={() => setShowDietLog(true)}>
                <Icon name="add_a_photo" /><strong>Log a Meal</strong><span>Track food, photos, and nutrition</span>
              </button>
              {checkin.dietLogs.length ? <div className="photo-grid">
                {checkin.dietLogs.map((log) => <article key={log.diet_log_id}>
                  {log.photoUrl ? <img src={log.photoUrl} alt={`${log.meal_type} log`} /> : <Icon name="restaurant" />}
                  <strong>{log.meal_type}</strong>
                  <span>{log.actual_food || 'Photo log'}</span>
                </article>)}
              </div> : null}
            </div>
          </section>
        </div>

        <section className="panel checkin-submit">
          <SectionHeader trailing={<span className="status-chip">{checkin.checkin?.status || 'not started'}</span>}>Submit Daily Check-in</SectionHeader>
          <div>
            <TextAreaField label="Additional notes for your coach" value={traineeNotes} onChange={(event) => setTraineeNotes(event.target.value)} disabled={isReadOnly} placeholder="Questions or anything else you want your coach to know…" />
            <Button icon="send" busy={busySubmit} disabled={isReadOnly || (client.isLocal && (!checkin.checkin?.wellness || recoveryDirty))} onClick={submitCheckin}>Submit Daily Check-in</Button>
          </div>
        </section>

        {checkin.feedback.length ? <section className="panel feedback-panel">
          <SectionHeader>Coach Feedback</SectionHeader>
          {checkin.feedback.map((item) => <blockquote key={item.feedback_id}>
            <strong>{item.coach?.display_name || 'Coach'}</strong>
            <p>{item.feedback_content}</p>
          </blockquote>)}
        </section> : null}
      </>}

      {/* WEEKLY PLAN TAB */}
      {activeTab === 'week' && <>
        <section className="panel">
          <SectionHeader>This Week's Training Schedule</SectionHeader>
          {weeklyPlan && weeklyPlan.length ? <div className="weekly-plan-grid">
            {weeklyPlan.map((day) => {
              const dayName = new Date(day.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
              const isToday = day.scheduled_date === getLocalDateString();
              return <article key={day.workout_day_id} className={`week-day-card ${isToday ? 'week-day-card--today' : ''}`}>
                <div className="week-day-card__header">
                  <span className="week-day-name">{dayName}</span>
                  <span className="week-day-date">{day.scheduled_date}</span>
                  {isToday && <span className="today-badge">Today</span>}
                </div>
                <h3>{day.title}</h3>
                <p>{day.estimated_duration_minutes} min · {day.plan?.plan_name || 'Training'}</p>
                <Button variant="outline" onClick={() => { setDate(day.scheduled_date); selectTab('training'); }}>View Details</Button>
              </article>;
            })}
          </div> : <PageState icon="calendar_today" title="No workouts this week" message="Your coach hasn't published a plan for this week yet." />}
        </section>

        <section className="panel">
          <SectionHeader>All Workout Plans</SectionHeader>
          {allPlans && allPlans.length ? <div className="plans-list">
            {allPlans.map((plan) => <article key={plan.workout_plan_id} className="plan-card">
              <div>
                <h3>{plan.plan_name}</h3>
                <p>{plan.goal || 'Training plan'}</p>
                <small>{plan.start_date} to {plan.end_date}</small>
              </div>
              <span className={`status-chip ${plan.status === 'published' ? 'status-chip--green' : ''}`}>{plan.status}</span>
            </article>)}
          </div> : <PageState icon="fitness_center" title="No training plans" message="Your coach will create plans for you." />}
        </section>
      </>}

      {/* TRAINING HISTORY TAB */}
      {activeTab === 'history' && <>
        <section className="panel">
          <SectionHeader>Recent Check-ins (Last 30 Days)</SectionHeader>
          {history && history.length ? <div className="history-list">
            {history.map((checkin) => {
              const hasWorkouts = checkin.workouts && checkin.workouts.length > 0;
              const hasFeedback = checkin.feedback && checkin.feedback.length > 0;
              const completedWorkouts = hasWorkouts ? checkin.workouts.filter((w) => w.status === 'completed').length : 0;

              return <article key={checkin.daily_checkin_id} className="history-card">
                <div className="history-card__header">
                  <span className="history-date">{checkin.checkin_date}</span>
                  <span className={`status-chip ${checkin.status === 'reviewed' ? 'status-chip--green' : checkin.status === 'submitted' ? 'status-chip--orange' : ''}`}>
                    {checkin.status}
                  </span>
                </div>

                {hasWorkouts && <div className="history-stat">
                  <Icon name="fitness_center" />
                  <span>{completedWorkouts} workout{completedWorkouts !== 1 ? 's' : ''} completed</span>
                </div>}

                {checkin.wellness && <div className="history-stat"><span>{checkin.wellness.sleepHours}h sleep · Fatigue {checkin.wellness.fatigue}/5 · {checkin.wellness.zone2Minutes} min cardio</span></div>}
                <Button variant="outline" onClick={() => { setDate(checkin.checkin_date); selectTab('training'); }}>View check-in</Button>
                {checkin.trainee_notes && <p className="history-notes">"{checkin.trainee_notes}"</p>}

                {hasFeedback && <div className="history-feedback">
                  <Icon name="chat" />
                  <strong>Coach feedback:</strong>
                  <p>"{checkin.feedback[0].feedback_content}"</p>
                </div>}
              </article>;
            })}
          </div> : <PageState icon="history" title="No check-in history" message="Your past check-ins will appear here." />}
        </section>
      </>}
    </div>

    {tutorial ? <Modal title={`${tutorial.exercise?.exercise_name || 'Exercise'} Guide`} onClose={() => setTutorial(null)}>{(() => {
      const videoUrl = tutorial.exercise?.video_url || getExerciseVideo(tutorial.exercise?.exercise_name);
      const thumbnail = videoUrl ? getYouTubeThumbnail(videoUrl) : null;
      return <>
        {thumbnail ? <a href={videoUrl} target="_blank" rel="noreferrer" className="tutorial-thumbnail"><img src={thumbnail} alt="Video preview" /><div className="play-overlay"><Icon name="play_circle" /></div></a> : <div className="tutorial-frame"><Icon name="description" /><span>{tutorial.exercise?.equipment || 'Exercise technique'}</span></div>}
        <p className="modal-copy">{tutorial.exercise?.description || tutorial.instructions || 'Follow the prescribed sets, reps and coach instructions.'}</p>
        {videoUrl ? <a className="button button--primary" href={videoUrl} target="_blank" rel="noreferrer"><Icon name="play_circle" />Watch Form Guide</a> : <a className="button button--primary" href={`https://www.youtube.com/results?search_query=${encodeURIComponent((tutorial.exercise?.exercise_name || 'Exercise') + ' form tutorial')}`} target="_blank" rel="noreferrer"><Icon name="play_circle" />Search Exercise Guide</a>}
      </>;
    })()}</Modal> : null}
    {workoutDay ? <WorkoutLogModal day={workoutDay} existing={workoutLogs.get(workoutDay.workout_day_id)} onClose={() => setWorkoutDay(null)} onSave={saveWorkout} /> : null}
    {showDietLog ? <DietLogModal meals={diet.meals} onClose={() => setShowDietLog(false)} onSave={saveMeal} /> : null}
    {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
  </>;
}
