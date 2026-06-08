import { useState, useEffect, useCallback } from 'react';
import * as auth from '../services/auth.js';

// Centralizes the Supabase auth session + profile. Session persistence (stay
// logged in) is handled by Supabase JS (localStorage) — we just mirror it here.
export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(auth.isAuthAvailable());

  // Track the session/user only.
  // IMPORTANT: never `await` another Supabase call inside the onAuthStateChange
  // callback. gotrue serializes auth ops behind a lock; awaiting a query (e.g.
  // fetchProfile) inside the callback can hold that lock and deadlock the auth
  // client, making every later query — and signOut — hang. This was the cause
  // of "profile stats won't load / can't log out" after revisiting the profile
  // (a TOKEN_REFRESHED event firing mid-navigation tripped the deadlock).
  // Profile loading is decoupled into the effect below.
  useEffect(() => {
    if (!auth.isAuthAvailable()) { setLoading(false); return; }
    let active = true;

    auth.getSession().then((session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const unsub = auth.onAuthChange((session) => {
      setUser(session?.user ?? null);   // synchronous state only
    });

    return () => { active = false; unsub(); };
  }, []);

  // Load the profile whenever the signed-in user changes — outside the auth
  // callback, so it never contends with the gotrue lock.
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let active = true;
    auth.fetchProfile(user.id)
      .then((p) => { if (active) setProfile(p); })
      .catch(() => { /* leave profile null; UI falls back to "You" */ });
    return () => { active = false; };
  }, [user?.id]);

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
