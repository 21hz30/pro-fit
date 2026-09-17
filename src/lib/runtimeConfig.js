export function getRuntimeConfigError({ dataMode, isDevelopment, hostname, supabaseUrl, publishableKey }) {
  if (dataMode && !['local', 'supabase'].includes(dataMode)) return 'Unknown data mode. Configure local development or the Supabase backend.';
  const isLocal = dataMode !== 'supabase';
  const isLoopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
  if (isLocal && !isDevelopment && !isLoopback) return 'This build uses browser-only storage and cannot accept live accounts. Connect the production backend before launching Pro-fit.';
  if (!isLocal) {
    if (!supabaseUrl || !publishableKey) return 'The account service is not configured. The site owner needs to connect the Supabase project.';
    try { if (new URL(supabaseUrl).protocol !== 'https:') return 'The account service must use an HTTPS URL.'; }
    catch { return 'The account service URL is invalid.'; }
  }
  return null;
}
