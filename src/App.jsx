import { TrainingSchedule } from './pages/TrainingSchedule.jsx';
import { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthProvider.jsx';
import { normalizeHashRoute, resolveAuthorizedRoute, ROLE_HOME } from './auth/routePolicy.js';
import { signOut } from './services/authService.js';
import { AppShell, Button, Icon, PageState } from './components/ui.jsx';
import { ConfigurationError, LoginPage, UpdatePasswordPage } from './pages/LoginPage.jsx';
import { TraineeDashboard } from './pages/TraineeDashboard.jsx';
import { CoachDashboard } from './pages/CoachDashboard.jsx';
import { WorkoutAssignment } from './pages/WorkoutAssignment.jsx';
import { DietAssignment } from './pages/DietAssignment.jsx';

const routeTitles = {
  login: 'Login', trainee: "Today's Training", day: 'My Day', coach: 'Coach Dashboard',
  workout: 'Workout Assignment', diet: 'Diet Assignment', schedule: 'Schedule',
  analytics: 'Analytics', 'update-password': 'Update Password',
};

function PlaceholderPage({ route }) {
  return <div className="page placeholder-page"><Icon name={route === 'schedule' ? 'calendar_today' : 'monitoring'} /><h1>{route}</h1><p>This authenticated coach area is reserved for the next MVP iteration.</p></div>;
}

export default function App() {
  const auth = useAuth();
  const [requested, setRequested] = useState(() => normalizeHashRoute(window.location.hash));
  useEffect(() => {
    const sync = () => setRequested(normalizeHashRoute(window.location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const navigate = (target) => { window.location.hash = `/${target}`; };
  const authorizedPath = resolveAuthorizedRoute({ requestedPath: requested.path, session: auth.session, profile: auth.profile, recoveryMode: auth.recoveryMode });
  useEffect(() => {
    if (!auth.loading && authorizedPath !== requested.path) navigate(authorizedPath);
  }, [auth.loading, authorizedPath, requested.path]);
  useEffect(() => { document.title = `Pro-fit | ${routeTitles[authorizedPath] || 'Athletic Architecture'}`; }, [authorizedPath]);

  if (auth.configError) return <ConfigurationError message={auth.configError} />;
  if (auth.loading) return <main className="boot-screen"><PageState title="Restoring your session" message="Pro-fit is validating your account and role." /></main>;
  if (authorizedPath === 'update-password') return <UpdatePasswordPage onDone={() => navigate(auth.profile ? ROLE_HOME[auth.profile.role] : 'login')} />;
  if (!auth.session || !auth.profile || authorizedPath === 'login') return <LoginPage />;

  async function logout() {
    try { await signOut(auth.client); } finally { navigate('login'); }
  }
  let page;
  if (authorizedPath === 'trainee' || authorizedPath === 'day') page = <TraineeDashboard initialTab={authorizedPath === 'day' ? 'day' : 'training'} />;
  else if (authorizedPath === 'coach') page = <CoachDashboard navigate={navigate} />;
  else if (authorizedPath === 'workout') page = <WorkoutAssignment requestedTraineeId={requested.query.get('trainee')} />;
  else if (authorizedPath === 'schedule') page = <TrainingSchedule navigate={navigate} />;
  else if (authorizedPath === 'diet') page = <DietAssignment requestedTraineeId={requested.query.get('trainee')} />;
  else page = <PlaceholderPage route={authorizedPath} />;

  return <AppShell route={authorizedPath} navigate={navigate} role={auth.profile.role} profile={auth.profile} onLogout={logout}>{auth.client.isLocal ? <div className="local-workspace-banner"><span>{auth.profile.is_sample ? 'SAMPLE WORKSPACE' : 'LOCAL WORKSPACE'}</span><small>{auth.profile.is_sample ? 'Illustrative activity · Saved in this browser only' : 'Saved in this browser only · Cloud sync is not connected'}</small></div> : null}{page}</AppShell>;
}
