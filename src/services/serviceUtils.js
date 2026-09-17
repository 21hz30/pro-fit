export class AppServiceError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppServiceError';
    this.code = options.code || 'APP_ERROR';
    this.details = options.details;
  }
}

export function assertResult(result, fallbackMessage) {
  if (result?.error) {
    throw new AppServiceError(result.error.message || fallbackMessage, {
      cause: result.error,
      code: result.error.code || 'SUPABASE_ERROR',
      details: result.error.details,
    });
  }
  return result?.data;
}

export async function requireUser(client) {
  if (!client) {
    throw new AppServiceError('The Supabase client is not configured.', { code: 'CONFIG_ERROR' });
  }
  const result = await client.auth.getUser();
  const data = assertResult(result, 'Unable to verify your session.');
  if (!data?.user) {
    throw new AppServiceError('Please sign in to continue.', { code: 'UNAUTHENTICATED' });
  }
  return data.user;
}

export function asNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function isUniqueViolation(error) {
  return error?.code === '23505';
}

