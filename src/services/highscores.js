import { supabase } from './supabase.js';

// ─── Time windows ─────────────────────────────────────────────────────────────

function windowStart(period) {
  const d = new Date();
  if (period === 'daily')   return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (period === 'monthly') return new Date(d.getFullYear(), d.getMonth(), 1);
  /* yearly */              return new Date(d.getFullYear(), 0, 1);
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
// Returns top-10 scores for a period, sorted by big_points → small_points → balut_count.

export async function fetchLeaderboard(period) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, big_points, small_points, balut_count, created_at')
    .gte('created_at', windowStart(period).toISOString())
    .order('big_points',   { ascending: false })
    .order('small_points', { ascending: false })
    .order('balut_count',  { ascending: false })
    .limit(10);
  if (error) { console.error('fetchLeaderboard:', error); return []; }
  return data ?? [];
}

// ─── Qualification ────────────────────────────────────────────────────────────
// Returns an array of period strings where the score makes the top 10.
// Compares using the three-level tiebreaker: big → small → baluts.

export async function checkQualifies(bigPts, smallPts, balutCount) {
  if (!supabase) return [];
  const periods = ['daily', 'monthly', 'yearly'];
  const boards  = await Promise.all(periods.map(fetchLeaderboard));
  return periods.filter((_, i) => _beats(bigPts, smallPts, balutCount, boards[i]));
}

function _beats(bigPts, smallPts, balutCount, board) {
  if (board.length < 10) return true;
  const last = board[board.length - 1];
  if (bigPts    !== last.big_points)   return bigPts    > last.big_points;
  if (smallPts  !== last.small_points) return smallPts  > last.small_points;
  return balutCount > last.balut_count;
}

// ─── Submit ───────────────────────────────────────────────────────────────────

export async function submitScore(playerName, bigPts, smallPts, balutCount) {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('scores').insert({
    player_name:  playerName.trim().slice(0, 20),
    big_points:   bigPts,
    small_points: smallPts,
    balut_count:  balutCount,
  });
  if (error) throw error;
}
