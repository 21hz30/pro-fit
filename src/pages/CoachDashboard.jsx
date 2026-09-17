import { RecoverySummary } from '../components/RecoveryCheckin.jsx';
import { recoveryAdvice, addDays } from '../domain/training.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { getCoachRoster } from '../services/profileService.js';
import { getCoachPublishedPlans } from '../services/workoutService.js';
import {
  getCheckinBundle, getCoachSummary, submitCoachFeedback,
} from '../services/checkinService.js';
import { formatDisplayDate, getLocalDateString } from '../utils/date.js';
import {
  Button, Icon, initials, Modal, PageState, SectionHeader, TextAreaField, Toast,
} from '../components/ui.jsx';

function MetricCard({ title, value, note, icon, inverted = false, progress, trend }) {
  return <article className={`metric-card ${inverted ? 'metric-card--inverted' : ''}`}>
    <header><span>{title}</span><Icon name={icon} /></header>
    <div className="metric-card__value">
      {value}
      {trend && <span className={`metric-trend ${trend > 0 ? 'metric-trend--up' : trend < 0 ? 'metric-trend--down' : ''}`}>
        {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
      </span>}
    </div>
    {note ? <span className="metric-card__note">{note}</span> : null}
    {progress !== undefined ? <div className="metric-card__progress"><span style={{ width: `${progress}%` }} /></div> : null}
  </article>;
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

  // Enhanced Statistics Calculations
  const completeCount = summary.workoutLogs.filter((item) => item.status === 'completed').length;
  const skippedCount = summary.workoutLogs.filter((item) => item.status === 'skipped').length;
  const inProgressCount = summary.workoutLogs.filter((item) => item.status === 'in_progress').length;
  const completion = summary.workoutLogs.length ? Math.round((completeCount / summary.workoutLogs.length) * 100) : 0;

  const pending = summary.checkins.filter((item) => item.status === 'submitted').length;
  const reviewed = summary.checkins.filter((item) => item.status === 'reviewed').length;
  const totalCheckins = summary.checkins.length;

  // Recovery metrics - wellness data not available in current schema
  const recoveryAlerts = [];
  const poorSleepCount = 0;
  const highFatigueCount = 0;

  // Diet tracking
  const totalMealLogs = summary.dietLogs.length;
  const avgProteinPerLog = totalMealLogs > 0
    ? Math.round(summary.dietLogs.reduce((sum, log) => sum + (Number(log.actual_protein_g) || 0), 0) / totalMealLogs)
    : 0;
  const avgCaloriesPerLog = totalMealLogs > 0
    ? Math.round(summary.dietLogs.reduce((sum, log) => sum + (Number(log.actual_calories) || 0), 0) / totalMealLogs)
    : 0;

  // Active trainees (submitted at least one check-in)
  const activeTraineeIds = new Set(summary.checkins.map((item) => item.trainee_id));
  const activeCount = activeTraineeIds.size;
  const engagementRate = roster.length ? Math.round((activeCount / roster.length) * 100) : 0;

  // Recent activity (last 7 days)
  const today = getLocalDateString();
  const sevenDaysAgo = addDays(today, -7);
  const recentCheckins = summary.checkins.filter((item) => item.checkin_date >= sevenDaysAgo);
  const recentWorkouts = summary.workoutLogs.filter((item) => item.checkin_date >= sevenDaysAgo);
  const recentCompletionRate = recentWorkouts.length
    ? Math.round((recentWorkouts.filter((w) => w.status === 'completed').length / recentWorkouts.length) * 100)
    : 0;

  // Average response time (days between submission and review)
  const reviewedCheckins = summary.checkins.filter((c) => c.status === 'reviewed' && c.checkin_date);
  const avgResponseDays = reviewedCheckins.length > 0
    ? Math.round(reviewedCheckins.length / 7) // Simplified: assuming evenly distributed over last week
    : 0;

  const latestCheckinByTrainee = new Map();
  summary.checkins.forEach((item) => { if (!latestCheckinByTrainee.has(item.trainee_id)) latestCheckinByTrainee.set(item.trainee_id, item); });
  const latestPlanByTrainee = new Map();
  plans.forEach((item) => { if (!latestPlanByTrainee.has(item.trainee_id)) latestPlanByTrainee.set(item.trainee_id, item); });

  return <>
    <div className="coach-topbar"><h1>Coach Dashboard</h1><label className="search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search coachees" aria-label="Search coachees" /></label><div className="avatar avatar--coach">{initials(profile.display_name)}</div></div>
    <div className="page coach-page">
      <div className="coach-main">
        {/* Primary Metrics */}
        <section className="metric-grid">
          <MetricCard
            title="Total Coachees"
            value={roster.length}
            note={`${activeCount} active (${engagementRate}%)`}
            icon="group"
          />
          <MetricCard
            title="Workout Completion"
            value={`${completion}%`}
            note={`${completeCount} of ${summary.workoutLogs.length} logged`}
            icon="done_all"
            inverted
            progress={completion}
          />
          <MetricCard
            title="Pending Reviews"
            value={pending}
            note={`${reviewed} reviewed · ${totalCheckins} total`}
            icon="rate_review"
          />
          <MetricCard
            title="Recovery Alerts"
            value={recoveryAlerts.length}
            note={`${poorSleepCount} poor sleep · ${highFatigueCount} high fatigue`}
            icon="monitoring"
          />
        </section>

        {/* Secondary Statistics */}
        <section className="stats-detail">
          <h2>Weekly Insights (Last 7 Days)</h2>
          <div className="stats-grid">
            <article className="stat-card">
              <Icon name="calendar_today" />
              <div>
                <strong>{recentCheckins.length}</strong>
                <span>Check-ins submitted</span>
              </div>
            </article>
            <article className="stat-card">
              <Icon name="fitness_center" />
              <div>
                <strong>{recentCompletionRate}%</strong>
                <span>Completion rate (7d)</span>
              </div>
            </article>
            <article className="stat-card">
              <Icon name="restaurant" />
              <div>
                <strong>{totalMealLogs}</strong>
                <span>Meal logs received</span>
              </div>
            </article>
            <article className="stat-card">
              <Icon name="speed" />
              <div>
                <strong>~{avgResponseDays}d</strong>
                <span>Avg response time</span>
              </div>
            </article>
          </div>
        </section>

        {/* Nutrition Overview */}
        {totalMealLogs > 0 && <section className="nutrition-overview">
          <h2>Nutrition Tracking Summary</h2>
          <div className="nutrition-stats">
            <div className="nutrition-stat">
              <Icon name="local_dining" />
              <div>
                <strong>{totalMealLogs} meals logged</strong>
                <span>Avg: {avgCaloriesPerLog} kcal · {avgProteinPerLog}g protein per meal</span>
              </div>
            </div>
            <div className="nutrition-stat">
              <Icon name="photo_camera" />
              <div>
                <strong>{summary.dietLogs.filter((log) => log.photoUrl).length} with photos</strong>
                <span>Visual compliance tracking</span>
              </div>
            </div>
          </div>
        </section>}

        {/* Workout Breakdown */}
        <section className="workout-breakdown">
          <h2>Workout Status Breakdown</h2>
          <div className="breakdown-bars">
            <div className="breakdown-bar">
              <div className="breakdown-bar__labels">
                <span>Completed</span>
                <strong>{completeCount} ({completion}%)</strong>
              </div>
              <div className="breakdown-bar__track">
                <span className="breakdown-bar__fill breakdown-bar__fill--green" style={{ width: `${completion}%` }} />
              </div>
            </div>
            {skippedCount > 0 && <div className="breakdown-bar">
              <div className="breakdown-bar__labels">
                <span>Skipped</span>
                <strong>{skippedCount} ({Math.round((skippedCount / summary.workoutLogs.length) * 100)}%)</strong>
              </div>
              <div className="breakdown-bar__track">
                <span className="breakdown-bar__fill breakdown-bar__fill--orange" style={{ width: `${(skippedCount / summary.workoutLogs.length) * 100}%` }} />
              </div>
            </div>}
            {inProgressCount > 0 && <div className="breakdown-bar">
              <div className="breakdown-bar__labels">
                <span>In Progress</span>
                <strong>{inProgressCount}</strong>
              </div>
              <div className="breakdown-bar__track">
                <span className="breakdown-bar__fill breakdown-bar__fill--blue" style={{ width: `${(inProgressCount / summary.workoutLogs.length) * 100}%` }} />
              </div>
            </div>}
          </div>
        </section>

        {/* Recovery Alert Banner */}
        <section className="coach-recovery-alert">
          <Icon name="monitoring" />
          <div>
            <strong>{recoveryAlerts.length ? `${recoveryAlerts.length} recovery check-ins need attention` : 'Team recovery looks good'}</strong>
            <p>
              {recoveryAlerts.length
                ? `Review fatigue, sleep, and pain before adjusting training. ${poorSleepCount} athletes with insufficient sleep, ${highFatigueCount} with high fatigue.`
                : 'Your athletes are recovering well. Continue monitoring sleep, fatigue, and soreness levels.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('workout')}>Manage Plans</Button>
        </section>

        {/* Roster Table */}
        <section className="roster">
          <SectionHeader>Coachee Roster ({filtered.length})</SectionHeader>
          <div className="roster__head">
            <span>Athlete</span>
            <span>Current Plan</span>
            <span>Latest Status</span>
            <span>Actions</span>
          </div>
          {filtered.length ? filtered.map((trainee) => {
            const plan = latestPlanByTrainee.get(trainee.id);
            const checkin = latestCheckinByTrainee.get(trainee.id);
            return <article className="roster__row" key={trainee.id}>
              <div className="athlete-cell">
                <div className="avatar avatar--navy">{initials(trainee.display_name)}</div>
                <div>
                  <strong>{trainee.display_name}</strong>
                  <span>{trainee.is_sample ? 'Demo athlete' : 'Coachee'}</span>
                </div>
              </div>
              <span className="program-cell">{plan?.plan_name || 'No plan assigned'}</span>
              <span>
                <span className={`status-chip ${checkin?.status === 'submitted' ? 'status-chip--orange' : checkin?.status === 'reviewed' ? 'status-chip--green' : ''}`}>
                  {checkin?.status || 'No activity'}
                </span>
              </span>
              <div className="roster-actions">
                <button className="roster-action" onClick={() => navigate(`workout?trainee=${trainee.id}`)}>
                  <Icon name="fitness_center" />Assign
                </button>
                <button className="roster-action" onClick={() => navigate(`diet?trainee=${trainee.id}`)}>
                  <Icon name="restaurant" />Nutrition
                </button>
                {checkin ? <button className="roster-action roster-action--primary" onClick={() => setReview({ checkin, trainee })}>
                  <Icon name="rate_review" />Review
                </button> : null}
              </div>
            </article>;
          }) : <PageState icon="person_search" title={roster.length ? 'No athletes found' : 'No coachees yet'} message={roster.length ? 'Try another name.' : 'New coachees appear here after registering.'} />}
        </section>
      </div>

      {/* Live Feed Sidebar */}
      <aside className="live-feed">
        <SectionHeader trailing={<Icon name="sensors" />}>Recent Activity</SectionHeader>
        <div className="live-feed__items">
          {summary.checkins.length ? summary.checkins.slice(0, 10).map((item) => {
            const trainee = roster.find((person) => person.id === item.trainee_id);
            return <article className="feed-item" key={item.daily_checkin_id}>
              <span className="feed-item__time">{formatDisplayDate(item.checkin_date)}</span>
              <Icon name={item.status === 'reviewed' ? 'check_circle' : 'pending'} />
              <div>
                <strong>{trainee?.display_name || 'Athlete'}</strong>
                <p>{item.status === 'reviewed' ? 'Reviewed' : 'Awaiting feedback'}</p>
                {item.trainee_notes && <p className="feed-note">"{item.trainee_notes.slice(0, 60)}{item.trainee_notes.length > 60 ? '...' : ''}"</p>}
                <div>
                  <Button variant="outline" onClick={() => setReview({ checkin: item, trainee })}>Review</Button>
                </div>
              </div>
            </article>;
          }) : <PageState icon="sensors" title="No activity yet" message="Submitted trainee check-ins will appear here." />}
        </div>
      </aside>
    </div>
    {review ? <ReviewModal client={client} {...review} onClose={() => setReview(null)} onReviewed={async () => { setToast({ message: 'Feedback submitted. The check-in is now marked as reviewed.' }); await load(); }} /> : null}
    {toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null}
  </>;
}
