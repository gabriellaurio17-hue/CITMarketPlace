import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { findAccount, getAccounts, updateStore, usernameExists } from '../data/localStore';
import { isCitEmail } from '../utils/validation';

const AuthContext = createContext(null);
const SESSION_KEY = 'cit-marketplace-demo-account';
export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const id = localStorage.getItem(SESSION_KEY); setProfile(getAccounts().find(a => a.id === id) || null); setLoading(false); }, []);
  const value = useMemo(() => ({
    user: profile ? { id: profile.id, email: profile.email } : null, profile, loading, profileError: '',
    refreshProfile: async () => {},
    signIn: async (email, password) => { const account = findAccount(email); if (!account || (account.password && account.password !== password)) return { error: { message: 'Email or password is incorrect.' } }; localStorage.setItem(SESSION_KEY, account.id); setProfile(account); return { data: { user: { ...account } }, error: null }; },
    signUp: async (form) => {
      const email = form.email.trim().toLowerCase();
      const username = form.username.trim();
      if (!isCitEmail(email)) return { error: { message: 'Use an email ending in @cit.edu.' } };
      if (findAccount(email)) return { error: { message: 'An account with this email already exists.' } };
      if (usernameExists(username)) return { error: { message: 'That username is already taken.' } };
      let account;
      const classification = form.classification;
      if (!['Admin', 'Student', 'Faculty/Staff'].includes(classification)) return { error: { message: 'Choose Admin, Student, or Faculty/Staff.' } };
      updateStore(s => { account = { id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, username, password: form.password, full_name: username, email, role: classification === 'Admin' ? 'admin' : 'user', classification, account_status: 'active', is_verified: true, created_at: new Date().toISOString() }; s.accounts.push(account); });
      return { data: { user: account }, error: null };
    },
    signOut: async () => { localStorage.removeItem(SESSION_KEY); setProfile(null); return { error: null }; },
  }), [loading, profile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context; }
