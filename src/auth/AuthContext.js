import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null);
      setProfileError('');
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, classification, account_status, is_verified')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      setProfile(null);
      setProfileError(error.message);
      return;
    }
    setProfile(data);
    setProfileError(data ? '' : 'Your account profile has not been created yet. Contact the marketplace administrator.');
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) setProfileError(error.message);
      setSession(data?.session || null);
      await loadProfile(data?.session?.user || null);
      if (active) setLoading(false);
    };
    initialize();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      setSession(nextSession);
      setProfileError('');
      // Defer the profile request so it runs after the auth event callback completes.
      window.setTimeout(async () => {
        if (!active) return;
        await loadProfile(nextSession?.user || null);
        if (active) setLoading(false);
      }, 0);
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    loading,
    profileError,
    refreshProfile: () => loadProfile(session?.user || null),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }),
    signUp: (form) => supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { full_name: form.name.trim(), classification: form.classification },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    }),
    signOut: () => supabase.auth.signOut(),
  }), [loadProfile, loading, profile, profileError, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
