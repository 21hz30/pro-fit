import { RecoverySummary } from '../components/RecoveryCheckin.jsx';
import { recoveryAdvice } from '../domain/training.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { getCoachRoster } from '../services/profileService.js';
import { getCoachPublishedPlans } from '../services/workoutService.js';
import {
  getCheckinBundle, getCoachSummary, submitCoachFeedback,
} from '../services/checkinService.js';
import { formatDisplayDate } from '../utils/date.js';
import {
  Button, Icon, initials, Modal, PageState, SectionHeader, TextAreaField, Toast,
} from '../components/ui.jsx';

function MetricCard({ title, value, note, icon, inverted = false, progress }) {
  return <article className={`metric-card ${inverted ? 'metric-card--inverted' : ''}`}><header><span>{title}</span><Icon name={icon} /></header><div className="metric-card__value">{value}</div>{note ? <span className="metric-card__note">{note}</span> : null}{progress !== undefined ? <div className="metric-card__progress"><span style={{ width: `${progress}%` }} /></div> : null}</article>;
}

function ReviewModal({ client, checkin, trainee, onClose, onReviewed }) {
  const [bundle, setBundle] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setBundle(await getCheckinBundle(client, checkin.daily_checkin_id, checkin)); } catch (nextError) { setError(nextError.message); } finally { setLoading(false); }
  }, [client, checkin]);
  useEffect(() => { load(); }, [load]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await submitCoachFeedback(client, checkin.daily_checkin_id, feedback); await load(); setFeedback(''); await onReviewed(); } catch (nextError) { setError(nextError.message); } finally { setBusy(false); }
  }
  return <Modal title={`${trainee?.display_name || 'Coachee'} · ${formatDisplayDate(checkin.checkin_date)}`} onClose={onClose}>{loading ? <PageState title="Loading check-in" /> : error && !bundle ? <PageState icon="warning" title="Unable to load" message={error} action={<Button onClick={load}>Retry</Button>} /> : <div className="review-content"><div className="review-status"><span className="status-chip">{bundle.checkin.status}</span><p>{bundle.checkin.trainee_notes || 'No general notes.'}</p></div><section><h3>Recovery & Cardio</h3><RecoverySummary wellness={bundle.checkin.wellness} /></section><section><h3>Workout Logs</h3>{bundle.workouts.length ? bundle.workouts.map((item) => <div className="review-row" key={item.workout_checkin_id}><strong>{item.title || 'Workout'}<small className="workout-log-status">{{ completed: 'Completed', in_progress: 'In progress', skipped: 'Skipped / Rested' }[item.status] || item.status}</small></strong><span>{item.actual_duration_minutes ? `${item.actual_duration_minutes} min` : 'No duration'}</span><p>{item.trainee_notes || 'No workout notes.'}</p></div>) : <p className="inline-empty">No workout log.</p>}</section><section><h3>Diet logs</h3>{bundle.dietLogs.length ? <div className="review-diet-grid">{bundle.dietLogs.map((log) => <article key={log.diet_log_id}>{log.photoUrl ? <img src={log.photoUrl} alt={`${log.meal_type} uploaded by trainee`} /> : null}<strong>{log.meal_type}</strong><p>{log.actual_food || 'Photo only'}</p><small>{log.actual_calories ?? '—'} kcal · {log.actual_protein_g ?? '—'} g protein</small></article>)}</div> : <p className="inline-empty">No diet log.</p>}</section><section><h3>Feedback history</h3>{bundle.feedback.length ? bundle.feedback.map((item) => <blockquote key={item.feedback_id}><strong>{item.coach?.display_name || 'Coach'}</strong><p>{item.feedback_content}</p></blockquote>) : <p className="inline-empty">No feedback yet.</p>}</section><form className="modal-form" onSubmit={submit}><TextAreaField label="Coach feedback" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Specific, actionable feedback…" required />{error ? <p className="form-error" role="alert">{error}</p> : null}<Button type="submit" icon="send" busy={busy}>Submit Feedback</Button></form></div>}</Modal>;
}

export function CoachDashboard({ navigate }) {
  const { client, profile } = useAuth();
  const [query, setQuery] = useState(''); const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [review, setReview] = useState(null); const [toast, setToast] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const roster = await getCoachRoster(client);
      const traineeIds = roster.map((item) => item.id);
      const [summary, plans] = await Promise.all([getCoachSummary(client, traineeIds), getCoachPublishedPlans(client, traineeIds)]);
      setData({ roster, summary, plans });
    } catch (nextError) { setError(nextError.message); } finally { setLoading(false); }
  }, [client]);
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => (data?.roster || []).filter((clientItem) => clientItem.display_name.toLowerCase().includes(query.toLowerCase())), [data, query]);

  if (loading) return <div className="page"><PageState title="Loading coach workspace" message="Loading your coachees and submitted check-ins." /></div>;
  if (error) return <div className="page"><PageState icon="warning" title="Coach dashboard unavailable" message={error} action={<Button onClick={load}>Retry</Button>} /></div>;

  const { roster, summary, plans } = data;
  const completeCount = summary.workoutLogs.filter((item) => item.status === 'completed').length;
  const completion = summary.workoutLogs.length ? Math.round((completeCount / summary.workoutLogs.length) * 100) : 0;
  const pending = summary.checkins.filter((item) => item.status === 'submitted').length;
  const recoveryAlerts = summary.checkins.filter((item) => item.status === 'submitted' && item.wellness && recoveryAdvice(item.wellness).tone !== 'normal');
  const latestCheckinByTrainee = new Map();
  summary.checkins.forEach((item) => { if (!latestCheckinByTrainee.has(item.trainee_id)) latestCheckinByTrainee.set(item.trainee_id, item); });
  const latestPlanByTrainee = new Map();
  plans.forEach((item) => { if (!latestPlanByTrainee.has(item.trainee_id)) latestPlanByTrainee.set(item.trainee_id, item); });

  return <>
    <div className="coach-topbar"><h1>Coachee Roster</h1><label className="search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search coachees" aria-label="Search coachees" /></label><div className="avatar avatar--coach">{initials(profile.display_name)}</div></div>
    <div className="page coach-page"><div className="coach-main"><section className="metric-grid"><MetricCard title="Coachees" value={roster.length} note="Students in your workspace" icon="group" /><MetricCard title="Logged Workouts Completed" value={`${completion}%`} icon="done_all" inverted progress={completion} /><MetricCard title="Needs Review" value={pending} note={`${summary.dietLogs.length} meal logs received`} icon="set_meal" /></section>
      <section className="coach-recovery-alert"><Icon name="monitoring" /><div><strong>{recoveryAlerts.length ? `${recoveryAlerts.length} recovery check-ins need attention` : 'Keep recovery in focus'}</strong><p>Review fatigue, sleep, and pain before adjusting training. Completion is based on logged workouts; rest days can be logged too.</p></div><Button variant="outline" onClick={() => navigate('workout')}>Basketball Week</Button></section><section className="roster"><SectionHeader>Roster Status</SectionHeader><div className="roster__head"><span>Coachee</span><span>Workouts</span><span>Status</span><span>Action</span></div>{filtered.length ? filtered.map((trainee) => { const plan = latestPlanByTrainee.get(trainee.id); const checkin = latestCheckinByTrainee.get(trainee.id); return <article className="roster__row" key={trainee.id}><div className="athlete-cell"><div className="avatar avatar--navy">{initials(trainee.display_name)}</div><div><strong>{trainee.display_name}</strong><span>{trainee.is_sample ? 'Sample student' : 'Coachee'}</span></div></div><span className="program-cell">{plan?.plan_name || 'No published plan'}</span><span><span className={`status-chip ${checkin?.status === 'submitted' ? 'status-chip--orange' : ''}`}>{checkin?.status || 'No check-in'}</span></span><div className="roster-actions"><button className="roster-action" onClick={() => navigate(`workout?trainee=${trainee.id}`)}>Assign workout</button><button className="roster-action" onClick={() => navigate(`diet?trainee=${trainee.id}`)}>Nutrition</button>{checkin ? <button className="roster-action" onClick={() => setReview({ checkin, trainee })}>Review</button> : null}</div></article>; }) : <PageState icon="person_search" title={roster.length ? 'No clients found' : 'No coachees yet'} message={roster.length ? 'Try another name.' : 'New coachees appear here after registering.'} />}</section>
    </div><aside className="live-feed"><SectionHeader trailing={<Icon name="sensors" />}>Submitted Check-ins</SectionHeader><div className="live-feed__items">{summary.checkins.length ? summary.checkins.slice(0, 8).map((item) => { const trainee = roster.find((person) => person.id === item.trainee_id); return <article className="feed-item" key={item.daily_checkin_id}><span className="feed-item__time">{formatDisplayDate(item.checkin_date)}</span><Icon name={item.status === 'reviewed' ? 'check_circle' : 'warning'} /><div><strong>{trainee?.display_name || 'Coachee'}</strong><p>{item.status === 'reviewed' ? 'Reviewed' : 'Waiting for coach feedback'}</p>{item.wellness ? <p className={`recovery-tag recovery-tag--${recoveryAdvice(item.wellness).tone}`}>{recoveryAdvice(item.wellness).title}</p> : null}<div><Button variant="outline" onClick={() => setReview({ checkin: item, trainee })}>Review</Button></div></div></article>; }) : <PageState icon="sensors" title="No submitted check-ins" message="Submitted trainee activity will appear here." />}</div></aside></div>
    {review ? <ReviewModal client={client} {...review} onClose={() => setReview(null)} onReviewed={async () => { setToast({ message: 'Feedback submitted. The check-in is now marked as reviewed.' }); await load(); }} /> : null}
    {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
  </>;
}

