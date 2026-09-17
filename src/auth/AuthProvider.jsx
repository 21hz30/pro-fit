import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { supabase, supabaseConfigError } from '../lib/supabase.js';
import { getCurrentProfile } from '../services/profileService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const hydrateProfile = useCallback(async (nextSession) => {
    if (!nextSession?.user) {
      setProfile(null);
      setLoading(false);
      return null;
    }
    try {
      const nextProfile = await getCurrentProfile(supabase, nextSession.user.id);
      if (nextProfile.status !== 'active') {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setError('This account has been disabled. Please contact an administrator.');
        setLoading(false);
        return null;
      }
      setProfile(nextProfile);
      setError(null);
      setLoading(false);
      return nextProfile;
    } catch (nextError) {
      try { await supabase.auth.signOut(); } catch { /* keep the profile error */ }
      setSession(null);
      setProfile(null);
      setError(nextError.message);
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }
      setSession(data.session);
      hydrateProfile(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      window.setTimeout(() => {
        if (active) hydrateProfile(nextSession);
      }, 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [hydrateProfile]);

  const refreshProfile = useCallback(() => hydrateProfile(session), [hydrateProfile, session]);
  const value = useMemo(() => ({
    client: supabase,
    configError: supabaseConfigError,
    session,
    user: session?.user || null,
    profile,
    loading,
    error,
    setError,
    recoveryMode,
    setRecoveryMode,
    refreshProfile,
  }), [session, profile, loading, error, recoveryMode, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
