import { useEffect, useState } from 'react';
import { getDayPlan, saveDayPlan } from '../services/dayPlanService.js';
import { DayPlanner } from './DayPlanner.jsx';
import { Button, PageState } from './ui.jsx';

export function DailyPlanning({ client, date, wellness, scheduledMinutes, readOnly, onOpenTraining }) {
  const [state, setState] = useState({ loading: true, plan: null, error: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ loading: true, plan: null, error: null });
    getDayPlan(client, date).then((plan) => {
      if (active) setState({ loading: false, plan, error: null });
    }).catch((error) => {
      if (active) setState({ loading: false, plan: null, error });
    });
    return () => { active = false; };
  }, [client, date, retry]);

  if (state.loading) return <PageState title="Loading daily priorities" />;
  if (state.error?.code === 'DAY_PLANNING_UNAVAILABLE') return <PageState
    icon="calendar_today"
    title="Daily planning is not connected yet"
    message="Planning is not enabled in this workspace. You can follow your assigned training and view recent check-ins and feedback below."
    action={<Button variant="outline" onClick={onOpenTraining}>Open Today’s Training</Button>}
  />;
  if (state.error) return <PageState icon="warning" title="Unable to load daily priorities" message={state.error.message} action={<Button onClick={() => setRetry((value) => value + 1)}>Retry</Button>} />;
  return <DayPlanner key={date} initial={state.plan} wellness={wellness} scheduledMinutes={scheduledMinutes} readOnly={readOnly} onSave={(input) => saveDayPlan(client, date, input)} />;
}
