export const ROLE_HOME = Object.freeze({ trainee: 'trainee', coach: 'coach' });

export function normalizeHashRoute(hash = '') {
  const raw = hash.replace(/^#\/?/, '') || 'login';
  const [path, query = ''] = raw.split('?');
  return { path: path === 'dashboard' ? 'trainee' : path, query: new URLSearchParams(query) };
}

export function resolveAuthorizedRoute({ requestedPath, session, profile, recoveryMode = false }) {
  if (requestedPath === 'update-password' || recoveryMode) return 'update-password';
  if (!session || !profile || profile.status !== 'active') return 'login';
  const allowed = profile.role === 'coach'
    ? new Set(['coach', 'workout', 'diet', 'schedule', 'analytics'])
    : new Set(['trainee', 'trainee/week', 'trainee/history', 'day']);
  return allowed.has(requestedPath) ? requestedPath : ROLE_HOME[profile.role] || 'login';
}
