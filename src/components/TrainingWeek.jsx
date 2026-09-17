import { addDays, TRAINING_GUIDANCE, WEEKDAY_LABELS, weekStart } from '../domain/training.js';
import { Button, Field, Icon } from './ui.jsx';

export function TrainingWeek({ date, onSelect, days = [] }) {
  const start = weekStart(date);
  return <section className="training-week" aria-label="Weekly training calendar">
    <div className="week-heading"><div><span className="eyebrow">BUILD YOUR GAME</span><h2>A purposeful week of training</h2><p>Aerobic fitness · Three-day strength split · Basketball</p></div>
      <div className="week-controls"><Button variant="outline" onClick={() => onSelect(addDays(date, -7))} aria-label="Previous week"><Icon name="chevron_left" /></Button><Field label="Training date" type="date" value={date} onChange={(event) => { if (event.target.value) onSelect(event.target.value); }} /><Button variant="outline" onClick={() => onSelect(addDays(date, 7))} aria-label="Next week"><Icon name="chevron_right" /></Button></div>
    </div>
    <div className="week-days">{WEEKDAY_LABELS.map((label, index) => {
      const dayDate = addDays(start, index); const day = days.find((item) => item.scheduled_date === dayDate);
      return <button key={dayDate} className={`week-day ${dayDate === date ? 'week-day--active' : ''}`} aria-pressed={dayDate === date} onClick={() => onSelect(dayDate)}><span>{label} <b>{dayDate.slice(5).replace('-', '/')}</b></span><strong>{day?.title || 'Not scheduled'}</strong><small>{day?.items?.some((item) => item.training_kind === 'zone2' || item.exercise?.exercise_name?.includes('Zone 2')) ? `${Math.round((day.items.find((item) => item.training_kind === 'zone2' || item.exercise?.exercise_name?.includes('Zone 2'))?.duration_seconds || 0) / 60)} min Zone 2` : 'View daily plan'}</small></button>;
    })}</div>
  </section>;
}

export function TrainingPrinciples() {
  return <details className="training-principles"><summary><Icon name="help" /> Why this plan? Intensity, recovery, and sources</summary>
    <div className="principles-grid"><article><h3>Easy Cardio · Zone 2</h3><p>{TRAINING_GUIDANCE.zone2}</p></article><article><h3>Strength Split · 3 Days a Week</h3><p>{TRAINING_GUIDANCE.strength}</p></article><article><h3>Recovery Is Part of Training</h3><p>{TRAINING_GUIDANCE.recovery}</p></article></div>
    <p className="source-note">This is an adjustable sample week, not a universal training prescription. Reference principles: <a href="https://www.cdc.gov/physical-activity-basics/measuring/index.html" target="_blank" rel="noreferrer">CDC · The Talk Test</a>; <a href="https://www.nsca.com/education/articles/position-statements/youth-resistance-training/" target="_blank" rel="noreferrer">NSCA · Youth Resistance Training</a>; <a href="https://www.cdc.gov/sleep/about/index.html" target="_blank" rel="noreferrer">CDC · Sleep Duration</a>. The talk test does not replace an individual Zone 2 assessment.</p>
  </details>;
}
