import { getRuntimeConfigError } from './runtimeConfig.js';
import { createClient } from '@supabase/supabase-js';
import { createLocalClient } from '../local/client.js';

export const isLocalMode = import.meta.env.VITE_DATA_MODE !== 'supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseConfigError = getRuntimeConfigError({
  dataMode: import.meta.env.VITE_DATA_MODE, isDevelopment: import.meta.env.DEV,
  hostname: window.location.hostname, supabaseUrl, publishableKey,
});

export const supabase = supabaseConfigError
  ? null
  : isLocalMode
  ? createLocalClient(window.localStorage, { events: window })
  : createClient(supabaseUrl, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

