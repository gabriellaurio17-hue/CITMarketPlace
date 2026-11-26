import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { findAccount, getAccounts, updateStore, usernameExists } from '../data/localStore';
import { isCitEmail } from '../utils/validation';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const SESSION_KEY = 'cit-marketplace-demo-account';

function toProfile(row, authUser) {
  const metadata = authUser?.user_metadata || {};
  const role = row?.role || 'user';
  const verificationStatus = row?.verification_status;
  const isVerified = row?.is_verified ?? (verificationStatus
    ? verificationStatus === 'approved'
    : Boolean(authUser?.email_confirmed_at));
  return {
    ...row,
    id: authUser?.id || row?.id,
    email: row?.email || authUser?.email || '',
    username: row?.username || metadata.username || row?.full_name || metadata.full_name || '',
    full_name: row?.full_name || metadata.full_name || metadata.username || authUser?.email || '',
    role,
    classification: row?.classification || metadata.classification || (role === 'admin' ? 'Admin' : 'Student'),
    account_status: row?.account_status || 'active',
    is_verified: role === 'admin' || isVerified,
    verification_status: verificationStatus || (isVerified ? 'approved' : 'pending'),
  };
}

async function loadProfile(authUser) {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Your marketplace profile was not returned.');
  return toProfile(row, authUser);
}

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const applyAuthUser = useCallback(async nextUser => {
    setAuthUser(nextUser || null);
    setProfileError('');
    if (!nextUser) { setProfile(null); return { profile: null, error: null }; }
    try {
      const nextProfile = await loadProfile(nextUser);
      setProfile(nextProfile);
      return { profile: nextProfile, error: null };
    } catch (error) {
      setProfile(null);
      setProfileError(`Could not load your marketplace profile: ${error.message}`);
      return { profile: null, error };
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const id = localStorage.getItem(SESSION_KEY);
      setProfile(getAccounts().find(account => account.id === id) || null);
      setLoading(false);
      return undefined;
    }

    let alive = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!alive) return;
      if (error) setProfileError(error.message);
      await applyAuthUser(data?.session?.user || null);
      if (alive) setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setAuthUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setProfileError('');
      } else {
        setTimeout(() => { if (alive) applyAuthUser(nextUser); }, 0);
      }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [applyAuthUser]);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !authUser) return profile;
    const result = await applyAuthUser(authUser);
    return result.profile;
  }, [applyAuthUser, authUser, profile]);

  const value = useMemo(() => ({
    user: isSupabaseConfigured
      ? (authUser ? { id: authUser.id, email: authUser.email } : null)
      : (profile ? { id: profile.id, email: profile.email } : null),
    profile,
    loading,
    profileError,
    refreshProfile,
    signIn: async (email, password) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) return { error };
        const { profile: nextProfile, error: profileLoadError } = await applyAuthUser(data.user);
        if (!nextProfile) {
          const { error: signOutError } = await supabase.auth.signOut();
          const details = profileLoadError?.message || 'The profile query returned no row.';
          const signOutDetails = signOutError ? ` Sign-out also failed: ${signOutError.message}` : '';
          return { error: new Error(`Your login succeeded, but your marketplace profile could not be loaded: ${details}.${signOutDetails}`) };
        }
        return { data: { user: nextProfile }, error: null };
      }
      const account = findAccount(email);
      if (!account || (account.password && account.password !== password)) return { error: { message: 'Email or password is incorrect.' } };
      localStorage.setItem(SESSION_KEY, account.id);
      setProfile(account);
      return { data: { user: { ...account } }, error: null };
    },
    signUp: async form => {
      const email = form.email.trim().toLowerCase();
      const username = form.username.trim();
      if (!isCitEmail(email)) return { error: new Error('Use an email ending in @cit.edu.') };
      if (!['Student', 'Faculty/Staff'].includes(form.classification)) return { error: new Error('Choose Student or Faculty/Staff.') };
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: form.password,
          options: { data: { username, full_name: username, classification: form.classification } },
        });
        if (error) return { error };
        if (data.session && data.user) {
          const nextProfile = await loadProfile(data.user);
          setAuthUser(data.user);
          setProfile(nextProfile);
        }
        return { data: { user: data.user, emailConfirmationRequired: !data.session }, error: null };
      }
      if (findAccount(email)) return { error: { message: 'An account with this email already exists.' } };
      if (usernameExists(username)) return { error: { message: 'That username is already taken.' } };
      let account;
      updateStore(store => {
        account = { id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, username, password: form.password, full_name: username, email, role: 'user', classification: form.classification, account_status: 'active', is_verified: false, verification_status: 'pending', verification_code: String(Math.floor(100000 + Math.random() * 900000)), created_at: new Date().toISOString() };
        store.accounts.push(account);
      });
      return { data: { user: account, emailConfirmationRequired: false }, error: null };
    },
    signOut: async () => {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut();
        return { error };
      }
      localStorage.removeItem(SESSION_KEY);
      setProfile(null);
      return { error: null };
    },
  }), [applyAuthUser, authUser, loading, profile, profileError, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
