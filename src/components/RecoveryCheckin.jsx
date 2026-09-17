import { useState } from 'react';
import { EMPTY_WELLNESS, recoveryAdvice, validateWellness } from '../domain/training.js';
import { Button, Field, SelectField, TextAreaField } from './ui.jsx';

export function RecoverySummary({ wellness }) {
  if (!wellness) return <p className="inline-empty">No recovery check-in yet.</p>;
  const advice = recoveryAdvice(wellness);
  return <div className="recovery-summary">
    <dl className="recovery-values">
      <div><dt>Sleep</dt><dd>{wellness.sleepHours} hours</dd></div><div><dt>Fatigue</dt><dd>{wellness.fatigue} / 5</dd></div>
      <div><dt>Muscle soreness</dt><dd>{wellness.sorenessLevel} / 10{wellness.sorenessArea ? ` · ${wellness.sorenessArea}` : ''}</dd></div>
      <div><dt>Pain / Discomfort</dt><dd>{wellness.painLevel} / 10{wellness.painArea ? ` · ${wellness.painArea}` : ''}</dd></div>
      <div><dt>Zone 2 completed</dt><dd>{wellness.zone2Minutes} min</dd></div><div><dt>Cardio effort</dt><dd>{wellness.zone2Rpe} / 10</dd></div>
    </dl><p><strong>Daily reflection: </strong>{wellness.feeling}</p>
    <div className={`recovery-advice recovery-advice--${advice.tone}`}><strong>{advice.title}</strong><p>{advice.message}</p></div>
  </div>;
}

export function RecoveryCheckin({ initial, readOnly, onSave, onDirty }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_WELLNESS, ...initial }));
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  function update(key, value) { setForm((previous) => ({ ...previous, [key]: value })); setSaved(false); onDirty?.(); }
  const advice = recoveryAdvice(form);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await onSave(validateWellness(form)); setSaved(true); } catch (nextError) { setError(nextError.message); } finally { setBusy(false); }
  }
  if (readOnly) return <RecoverySummary wellness={initial} />;
  return <form className="recovery-form" onSubmit={submit}>
    <p className="section-intro">Take a minute to check in with your body before deciding how much to train. You can log rest days, too.</p>
    <div className="recovery-fields">
      <Field label="Sleep last night (hours)" type="number" required min="0" max="24" step="0.5" value={form.sleepHours} onChange={(e) => update('sleepHours', e.target.value)} placeholder="e.g., 8" />
      <SelectField label="Fatigue today" required value={form.fatigue} onChange={(e) => update('fatigue', e.target.value)}><option value="">Select an option</option><option value="1">1 · Energized</option><option value="2">2 · Slightly tired</option><option value="3">3 · Moderately tired</option><option value="4">4 · Very tired</option><option value="5">5 · Exhausted</option></SelectField>
      <Field label="Muscle soreness (0–10)" type="number" required min="0" max="10" value={form.sorenessLevel} onChange={(e) => update('sorenessLevel', e.target.value)} placeholder="0 = no soreness" />
      <Field label="Sore areas" required={Number(form.sorenessLevel) > 0} value={form.sorenessArea} onChange={(e) => update('sorenessArea', e.target.value)} placeholder="e.g., quads or calves; leave blank if none" maxLength={200} />
      <Field label="Pain or discomfort (0–10)" type="number" required min="0" max="10" value={form.painLevel} onChange={(e) => update('painLevel', e.target.value)} placeholder="0 = no discomfort" />
      <Field label="Pain or discomfort location" required={Number(form.painLevel) > 0} value={form.painArea} onChange={(e) => update('painArea', e.target.value)} placeholder="Record separately from normal muscle soreness" maxLength={200} />
      <Field label="Zone 2 minutes completed" type="number" required min="0" max="240" value={form.zone2Minutes} onChange={(e) => update('zone2Minutes', e.target.value)} placeholder="0 if resting; target: 45 minutes" />
      <Field label="Cardio effort (0–10)" type="number" required min="0" max="10" value={form.zone2Rpe} onChange={(e) => update('zone2Rpe', e.target.value)} placeholder="0 if resting; easy effort: about 2–4" />
    </div>
    <TextAreaField label="Training and recovery reflection" required maxLength={1000} value={form.feeling} onChange={(e) => update('feeling', e.target.value)} placeholder="How did you feel? Did you reduce training or rest? Any questions for your coach?" />
    <div className={`recovery-advice recovery-advice--${advice.tone}`} role="status"><strong>{advice.title}</strong><p>{advice.message}</p></div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {saved ? <p className="form-success" role="status">Recovery saved. Finish any other logs, then submit your daily check-in.</p> : null}
    <Button type="submit" busy={busy} icon="check_circle">Save recovery check-in</Button>
  </form>;
}
