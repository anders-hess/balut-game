import { supabase } from './supabase.js';

// Auth is a thin wrapper over Supabase Auth. Passwords are never stored or
// echoed by this app — Supabase keeps only a salted hash. All functions no-op
// or throw a friendly error when Supabase isn't configured (dev without env).

export function isAuthAvailable() {
  return !!supabase;
}

/** Sign up with email + password; `username` becomes the public display name. */
export async function signUp({ email, password, username }) {
  if (!supabase) throw new Error('Accounts are unavailable right now.');
  const uname = username.trim();

  // Friendly pre-check (the DB also enforces uniqueness via a unique index).
  const { data: taken } = await supabase
    .from('profiles').select('id').eq('username', uname).maybeSingle();
  if (taken) throw new Error('That username is already taken.');

  // username is read by the on_auth_user_created trigger to create the profile.
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username: uname } },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  if (!supabase) throw new Error('Accounts are unavailable right now.');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function fetchProfile(userId) {
  if (!supabase || !userId) return null;
  const { data } = await supabase
    .from('profiles').select('id, username').eq('id', userId).maybeSingle();
  return data;
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
