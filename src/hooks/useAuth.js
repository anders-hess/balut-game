import { useState, useEffect, useCallback } from 'react';
import * as auth from '../services/auth.js';

// Centralizes the Supabase auth session + profile. Session persistence (stay
// logged in) is handled by Supabase JS (localStorage) — we just mirror it here.
export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(auth.isAuthAvailable());

  useEffect(() => {
    if (!auth.isAuthAvailable()) { setLoading(false); return; }
    let active = true;

    auth.getSession().then(async (session) => {
      if (!active) return;
      const u = session?.user ?? null;
      setUser(u);
      setProfile(u ? await auth.fetchProfile(u.id) : null);
      setLoading(false);
    });

    const unsub = auth.onAuthChange(async (session) => {
      const u = session?.user ?? null;
      setUser(u);
      setProfile(u ? await auth.fetchProfile(u.id) : null);
    });

    return () => { active = false; unsub(); };
  }, []);

  const signIn  = useCallback((creds) => auth.signIn(creds),  []);
  const signUp  = useCallback((creds) => auth.signUp(creds),  []);
  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return {
    user,
    profile,
    username: profile?.username ?? null,
    loading,
    available: auth.isAuthAvailable(),
    signIn,
    signUp,
    signOut,
  };
}
