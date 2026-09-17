import { useState } from 'react';
import { suggestDay } from '../domain/dayPlanner.js';
import { Button, Icon, SelectField } from './ui.jsx';

export function DayPlanner({ initial, wellness, scheduledMinutes, readOnly, onSave }) {
  const [form, setForm] = useState(initial || { availableMinutes: 30, schoolLoad: 'normal', energy: 'ready' });
  const [saved, setSaved] = useState(Boolean(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const suggestion = suggestDay(form, wellness, scheduledMinutes);
  function change(key, value) { setForm((previous) => ({ ...previous, [key]: value })); setSaved(false); setError(''); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave(form); setSaved(true); } catch (next) { setError(next.message); } finally { setBusy(false); }
  }
  return <section className="day-planner" aria-labelledby="planner-heading">
    <div className="day-planner__form"><span className="eyebrow">MY DAY · OPTIONAL PLANNING</span><h2 id="planner-heading">Make today fit.</h2><p>Tell Pro-fit how much time and energy you have. It suggests a realistic way to approach your coach-assigned plan.</p>
      <form onSubmit={save}><div className="planner-fields">
        <SelectField label="Time available" value={form.availableMinutes} disabled={readOnly} onChange={(e) => change('availableMinutes', Number(e.target.value))}>{[0, 10, 15, 20, 30, 45, 60, 90, 120, 180].map((m) => <option key={m} value={m}>{m === 0 ? 'Today is a rest day' : `${m} minutes`}</option>)}</SelectField>
        <SelectField label="School workload" value={form.schoolLoad} disabled={readOnly} onChange={(e) => change('schoolLoad', e.target.value)}><option value="light">Light day</option><option value="normal">Typical school day</option><option value="heavy">Exams / heavy homework</option></SelectField>
        <SelectField label="Energy right now" value={form.energy} disabled={readOnly} onChange={(e) => change('energy', e.target.value)}><option value="ready">Feeling ready</option><option value="tired">Low energy</option><option value="pain">Pain or discomfort</option></SelectField>
      </div><div className="planner-save"><Button variant="dark" type="submit" busy={busy} disabled={readOnly}>{saved ? 'Update daily priorities' : 'Save daily priorities'}</Button><span role="status">{readOnly ? 'This day is read-only' : saved ? 'Saved for this day' : 'Adjust the options to explore'}</span></div>{error ? <p className="form-error" role="alert">{error}</p> : null}</form>
    </div><div className={`day-planner__suggestion day-planner__suggestion--${suggestion.tone}`}><div className="suggestion-top"><span className="eyebrow">SUGGESTED APPROACH</span><Icon name={suggestion.minutes ? 'fitness_center' : 'check_circle'} /></div><strong className="suggestion-minutes">{suggestion.minutes || 'Rest'}{suggestion.minutes ? <small> min</small> : null}</strong><h3>{suggestion.title}</h3><p>{suggestion.reason}</p><ul>{suggestion.steps.map((step) => <li key={step}>{step}</li>)}</ul><small>This is a planning aid. Your assigned training is in Today’s Training.</small></div>
  </section>;
}
