import { supabase } from './supabase.js';

function weekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff).toISOString();
}

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export async function trackEvent(type, metadata = null) {
  if (!supabase) return;
  try {
    await supabase.from('events').insert({ type, metadata });
  } catch {
    // analytics are best-effort — never throw
  }
}

export async function fetchGameCount() {
  if (!supabase) return 0;
  try {
    const { count, error } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchInsights() {
  if (!supabase) return null;

  const ws = weekStart();
  const ms = monthStart();

  const [pvAll, pvWeek, pvMonth, eventsRes, scoresRes, scoresWeek, scoresMonth] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('type', 'page_view'),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('type', 'page_view').gte('created_at', ws),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('type', 'page_view').gte('created_at', ms),
    supabase.from('events').select('type, metadata').eq('type', 'game_completed'),
    supabase.from('scores').select('big_points, small_points, balut_count').limit(1000),
    supabase.from('scores').select('*', { count: 'exact', head: true }).gte('created_at', ws),
    supabase.from('scores').select('*', { count: 'exact', head: true }).gte('created_at', ms),
  ]);

  const completedEvts = eventsRes.data ?? [];

  const scoreRows = scoresRes.data ?? [];
  const n = scoreRows.length;
  const avgBig    = n ? Math.round(scoreRows.reduce((a, s) => a + s.big_points,   0) / n) : null;
  const avgSmall  = n ? Math.round(scoreRows.reduce((a, s) => a + s.small_points, 0) / n) : null;
  const avgBaluts = n ? +(scoreRows.reduce((a, s) => a + s.balut_count, 0) / n).toFixed(1) : null;

  const mc  = completedEvts.length;
  const pct = (key) => mc === 0 ? null
    : Math.round(completedEvts.filter(e => e.metadata?.[key]).length / mc * 100);

  return {
    visits: {
      allTime:   pvAll.count  ?? 0,
      thisWeek:  pvWeek.count  ?? 0,
      thisMonth: pvMonth.count ?? 0,
    },
    games: {
      allTime:   scoreRows.length,
      thisWeek:  scoresWeek.count  ?? 0,
      thisMonth: scoresMonth.count ?? 0,
    },
    scores: {
      avgBig,
      avgSmall,
      avgBaluts,
      scoresCount: n,
    },
    scorecard: {
      pctFours:     pct('hadFours'),
      pctFives:     pct('hadFives'),
      pctSixes:     pct('hadSixes'),
      pctStraight:  pct('hadStraight'),
      pctFullHouse: pct('hadFullHouse'),
      pctChoice:    pct('hadChoice'),
      pctBalut:     pct('hadBalut'),
      eventsCount:  mc,
    },
  };
}
