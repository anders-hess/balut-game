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

// Average aggregates from a set of score rows (one decimal place).
function aggregateScores(rows) {
  const n = rows.length;
  return {
    avgBig:      n ? +(rows.reduce((a, s) => a + s.big_points,   0) / n).toFixed(1) : null,
    avgSmall:    n ? +(rows.reduce((a, s) => a + s.small_points, 0) / n).toFixed(1) : null,
    avgBaluts:   n ? +(rows.reduce((a, s) => a + s.balut_count,  0) / n).toFixed(1) : null,
    scoresCount: n,
  };
}

// Threshold-hit percentages from a set of game_completed events.
function aggregatePcts(evts) {
  const mc  = evts.length;
  const pct = (key) => mc === 0 ? null
    : Math.round(evts.filter(e => e.metadata?.[key]).length / mc * 100);
  return {
    pctFours:     pct('hadFours'),
    pctFives:     pct('hadFives'),
    pctSixes:     pct('hadSixes'),
    pctStraight:  pct('hadStraight'),
    pctFullHouse: pct('hadFullHouse'),
    pctChoice:    pct('hadChoice'),
    pctBalut:     pct('hadBalut'),
    eventsCount:  mc,
  };
}

// fetchInsights() returns all-players stats. When a userId is passed, it
// additionally returns that user's own stats under `user` (null otherwise) so
// the Insights screen can render an all-players vs. you comparison.
export async function fetchInsights(userId = null) {
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
  const scoreRows     = scoresRes.data ?? [];

  const result = {
    visits: {
      allTime:   pvAll.count   ?? 0,
      thisWeek:  pvWeek.count   ?? 0,
      thisMonth: pvMonth.count ?? 0,
    },
    games: {
      allTime:   scoreRows.length,
      thisWeek:  scoresWeek.count  ?? 0,
      thisMonth: scoresMonth.count ?? 0,
    },
    scores:    aggregateScores(scoreRows),
    scorecard: aggregatePcts(completedEvts),
    user:      null,
  };

  if (userId) {
    const [uScores, uWeek, uMonth] = await Promise.all([
      supabase.from('scores').select('big_points, small_points, balut_count').eq('user_id', userId).limit(1000),
      supabase.from('scores').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', ws),
      supabase.from('scores').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', ms),
    ]);
    const uRows   = uScores.data ?? [];
    // Per-user threshold rates rely on game_completed events carrying the user's
    // id in metadata (stamped at submit time once auth is wired).
    const uEvents = completedEvts.filter(e => e.metadata?.userId === userId);
    result.user = {
      games: {
        allTime:   uRows.length,
        thisWeek:  uWeek.count  ?? 0,
        thisMonth: uMonth.count ?? 0,
      },
      scores:    aggregateScores(uRows),
      scorecard: aggregatePcts(uEvents),
    };
  }

  return result;
}
