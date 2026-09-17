import { AppServiceError, assertResult } from './serviceUtils.js';

export async function signUpTrainee(client, { email, password, displayName, role }) {
  const data = assertResult(await client.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim(), ...(client?.isLocal ? { local_role: role } : {}) } },
  }), 'Unable to create your account.');
  return {
    user: data.user,
    session: data.session,
    needsEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export async function signIn(client, { email, password }) {
  const data = assertResult(await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  }), 'Unable to sign in.');
  return data;
}

export async function signOut(client) {
  assertResult(await client.auth.signOut(), 'Unable to sign out.');
}

export async function sendPasswordReset(client, email, origin = window.location.origin) {
  assertResult(await client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/#/update-password`,
  }), 'Unable to send the password reset email.');
}

export async function updatePassword(client, password) {
  if (password.length < 8) {
    throw new AppServiceError('Your new password must be at least 8 characters.', { code: 'VALIDATION_ERROR' });
  }
  return assertResult(await client.auth.updateUser({ password }), 'Unable to update your password.');
}

