import { AppServiceError, assertResult, requireUser } from './serviceUtils.js';

export async function getCurrentProfile(client, userId) {
  if (client?.isLocal) return client.operations.getCurrentProfile(userId);
  const id = userId || (await requireUser(client)).id;
  const data = assertResult(
    await client.from('profiles').select('id, display_name, role, avatar_path, status').eq('id', id).maybeSingle(),
    'Unable to load your profile.',
  );
  if (!data) {
    throw new AppServiceError('Your account is missing a profile. Please contact an administrator.', { code: 'PROFILE_MISSING' });
  }
  return data;
}

export async function getCoachRoster(client) {
  if (client?.isLocal) return client.operations.getCoachRoster();
  const user = await requireUser(client);
  const relationships = assertResult(
    await client
      .from('coach_trainees')
      .select('coach_trainee_id, trainee_id, is_primary, started_at, trainee:profiles!coach_trainees_trainee_id_fkey(id, display_name, avatar_path, status)')
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .order('is_primary', { ascending: false })
      .order('started_at', { ascending: true }),
    'Unable to load the coachee roster.',
  ) || [];

  return relationships
    .filter((relationship) => relationship.trainee?.status === 'active')
    .map((relationship) => ({
      relationshipId: relationship.coach_trainee_id,
      isPrimary: relationship.is_primary,
      startedAt: relationship.started_at,
      ...relationship.trainee,
    }));
}

