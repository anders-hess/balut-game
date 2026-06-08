import { supabase } from './supabase.js';

// Recent games for a user, newest first.
export async function fetchUserGames(userId, limit = 50) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('scores')
    .select('big_points, small_points, balut_count, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('fetchUserGames:', error); return []; }
  return data ?? [];
}

// Personal record (highest grand total), correct regardless of list length.
export async function fetchUserBest(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('scores')
    .select('big_points, small_points, balut_count, created_at')
    .eq('user_id', userId)
    .order('big_points',   { ascending: false })
    .order('small_points', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('fetchUserBest:', error); return null; }
  return data;
}
