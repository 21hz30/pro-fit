import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateStreak, getLocalDateString } from '../src/utils/date.js';
import { normalizeHashRoute, resolveAuthorizedRoute } from '../src/auth/routePolicy.js';

test('local date uses local calendar fields instead of UTC slicing', () => {
  const localDate = new Date(2026, 7, 17, 0, 5, 0);
  assert.equal(getLocalDateString(localDate), '2026-08-17');
});

test('streak only counts consecutive submitted or reviewed dates ending today', () => {
  assert.equal(calculateStreak([
    { checkin_date: '2026-08-17', status: 'submitted' },
    { checkin_date: '2026-08-16', status: 'reviewed' },
    { checkin_date: '2026-08-15', status: 'draft' },
  ], '2026-08-17'), 2);
});

test('hash route normalization preserves query and canonicalizes dashboard', () => {
  const route = normalizeHashRoute('#/dashboard?trainee=abc');
  assert.equal(route.path, 'trainee');
  assert.equal(route.query.get('trainee'), 'abc');
});

test('role routing covers unauthenticated, trainee, coach, disabled and missing profile', () => {
  const session = { user: { id: 'u1' } };
  assert.equal(resolveAuthorizedRoute({ requestedPath: 'coach', session: null, profile: null }), 'login');
  assert.equal(resolveAuthorizedRoute({ requestedPath: 'coach', session, profile: null }), 'login');
  assert.equal(resolveAuthorizedRoute({ requestedPath: 'coach', session, profile: { role: 'trainee', status: 'active' } }), 'trainee');
  assert.equal(resolveAuthorizedRoute({ requestedPath: 'trainee', session, profile: { role: 'coach', status: 'active' } }), 'coach');
  assert.equal(resolveAuthorizedRoute({ requestedPath: 'workout', session, profile: { role: 'coach', status: 'active' } }), 'workout');
  assert.equal(resolveAuthorizedRoute({ requestedPath: 'trainee', session, profile: { role: 'trainee', status: 'disabled' } }), 'login');
});

test('password recovery always resolves to the update-password route', () => {
  assert.equal(resolveAuthorizedRoute({ requestedPath: 'login', recoveryMode: true }), 'update-password');
});


test('trainee tabs retain their routes while coaches cannot open them', () => {
  const session = { user: { id: 'u1' } };
  for (const requestedPath of ['trainee/week','trainee/history','day']) {
    assert.equal(resolveAuthorizedRoute({requestedPath,session,profile:{role:'trainee',status:'active'}}),requestedPath);
    assert.equal(resolveAuthorizedRoute({requestedPath,session,profile:{role:'coach',status:'active'}}),'coach');
  }
});
