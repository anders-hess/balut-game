/**
 * Achievements service — persistence + aggregation.
 *
 * Logged-in users: unlocked badges live in the Supabase `achievements` table;
 * lifetime counters and streaks are derived from `scores` at read time.
 * Guests: everything lives in localStorage (`balut_achievements`), which is what
 * the sign-up nudge is about — guest badges are lost if storage is cleared.
 *
 * All calls are safe no-ops / local-only when Supabase is absent.
 */

import { supabase } from './supabase.js';
import { FEATS, PROGRESSION, STREAKS, TIERS } from '../logic/achievements/definitions.js';
import { evaluateFeats, computeStats, overallTier } from '../logic/achievements/evaluate.js';
import { weekIndex, streakFromWeekSet, playStreak } from '../logic/achievements/streaks.js';

const GUEST_KEY = 'balut_achievements';

const DEF_BY_ID = {};
for (const d of [...FEATS, ...PROGRESSION, ...STREAKS]) DEF_BY_ID[d.id] = d;
export function getAchievementDef(id) { return DEF_BY_ID[id]; }

const TIER_BY_NUM = Object.fromEntries(TIERS.map(t => [t.tier, t]));
const TIER_MEDAL = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' };

/** Build an AchievementToast-ready def for a newly unlocked entry. */
function toastDef(id, tier) {
  if (id === 'overall_progress') {
    const t = TIER_BY_NUM[tier];
    return { id, icon: TIER_MEDAL[t.key], name: `${t.label} Collector`, isMilestone: true };
  }
  return { ...DEF_BY_ID[id], isMilestone: false };
}

// ─── Guest localStorage ───────────────────────────────────────────────────────

function emptyGuest() {
  return {
    unlocked: {},   // { id: { tier, at } }
    stats: { gamesPlayed: 0, lifetimeBaluts: 0, lifetimeBigPoints: 0, weeks: [], best: 0 },
  };
}

function loadGuest() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        unlocked: parsed.unlocked ?? {},
        stats: { ...emptyGuest().stats, ...(parsed.stats ?? {}) },
      };
    }
  } catch { /* ignore corrupt storage */ }
  return emptyGuest();
}

function saveGuest(data) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ─── Supabase reads ───────────────────────────────────────────────────────────

async function fetchUnlockedRows(userId) {
  if (!supabase || !userId) return {};
  const { data, error } = await supabase
    .from('achievements')
    .select('achievement_id, tier, unlocked_at')
    .eq('user_id', userId);
  if (error) { console.error('fetchUnlockedRows:', error); return {}; }
  const map = {};
  for (const r of data ?? []) map[r.achievement_id] = { tier: r.tier, at: r.unlocked_at };
  return map;
}

async function fetchUserScores(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('scores')
    .select('big_points, small_points, balut_count, created_at')
    .eq('user_id', userId);
  if (error) { console.error('fetchUserScores:', error); return []; }
  return data ?? [];
}

/**
 * Competitive standings for `username`'s logged-in scores, ranked across ALL
 * players. Returns the weeks they made the weekly Top 10 (for the streak), plus
 * whether they were ever ranked #1 in any week and in any calendar month.
 * Bounded to scores on/after `since`.
 */
async function fetchCompetitive(username, since) {
  const empty = { present: [], everTop1Week: false, everTop1Month: false };
  if (!supabase || !username) return empty;
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, big_points, small_points, balut_count, created_at, is_guest')
    .gte('created_at', since.toISOString());
  if (error) { console.error('fetchCompetitive:', error); return empty; }

  const isMe = (r) => !r.is_guest && r.player_name === username;
  const cmp = (a, b) =>
    b.big_points - a.big_points ||
    b.small_points - a.small_points ||
    b.balut_count - a.balut_count;

  const group = (keyFn) => {
    const m = new Map();
    for (const r of data ?? []) {
      const k = keyFn(r);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return m;
  };

  const present = [];
  let everTop1Week = false;
  for (const [wk, rows] of group(r => weekIndex(new Date(r.created_at)))) {
    rows.sort(cmp);
    const top10 = rows.slice(0, 10);
    if (top10.some(isMe)) present.push(wk);
    if (top10[0] && isMe(top10[0])) everTop1Week = true;
  }

  let everTop1Month = false;
  for (const [, rows] of group(r => {
    const d = new Date(r.created_at);
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
  })) {
    rows.sort(cmp);
    if (rows[0] && isMe(rows[0])) everTop1Month = true;
  }

  return { present, everTop1Week, everTop1Month };
}

// ─── Public: unlocked map (logged-in or guest) ────────────────────────────────

export async function fetchUnlocked(user) {
  if (user?.id) return fetchUnlockedRows(user.id);
  return loadGuest().unlocked;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function persistUnlocks(user, entries) {
  // entries: [{ id, tier }]
  if (entries.length === 0) return;
  if (user?.id && supabase) {
    const now = new Date().toISOString();
    const rows = entries.map(e => ({
      user_id: user.id, achievement_id: e.id, tier: e.tier, unlocked_at: now,
    }));
    const { error } = await supabase
      .from('achievements')
      .upsert(rows, { onConflict: 'user_id,achievement_id' });
    if (error) console.error('persistUnlocks:', error);
  }
}

// ─── Main: process one finished solo game ─────────────────────────────────────

/**
 * Evaluate + persist achievements for a finished single-player game.
 * For logged-in users call this AFTER the score has been saved (so lifetime
 * aggregates include the current game).
 *
 * @returns {Promise<{ unlocked: Array, personalBest: boolean, isGuest: boolean }>}
 *   `unlocked` items are definition objects augmented with `{ tier, isMilestone }`.
 */
export async function processSoloGame({ user, username, scorecard, featFlags, totalBig, balutCount }) {
  const isGuest = !user?.id;
  const earnedFeats = evaluateFeats({ scorecard, featFlags });

  if (isGuest) return processGuest({ earnedFeats, totalBig, balutCount });

  const [unlockedMap, scores] = await Promise.all([
    fetchUnlockedRows(user.id),
    fetchUserScores(user.id),
  ]);

  const entries = [];   // { id, tier } to persist

  // Feats (tier 0, one-time).
  for (const id of earnedFeats) {
    if (!(id in unlockedMap)) entries.push({ id, tier: 0 });
  }

  // Overall collector tier — `scores` already includes the just-saved game.
  const stats = computeStats(scores);
  const ot = overallTier(stats);
  if (ot > (unlockedMap.overall_progress?.tier ?? 0)) {
    entries.push({ id: 'overall_progress', tier: ot });
  }

  // Competitive — rank this user's logged-in scores against everyone. A ~40-day
  // window covers the current week and month.
  const since = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  const { everTop1Week, everTop1Month } = await fetchCompetitive(username, since);
  if ((everTop1Week || everTop1Month) && !('first_blood' in unlockedMap)) {
    entries.push({ id: 'first_blood', tier: 0 });
  }
  if (everTop1Week && !('top_of_the_week' in unlockedMap)) {
    entries.push({ id: 'top_of_the_week', tier: 0 });
  }
  if (everTop1Month && !('top_of_the_month' in unlockedMap)) {
    entries.push({ id: 'top_of_the_month', tier: 0 });
  }

  // Personal best: strictly the unique highest grand total (suppress on 1st game).
  const higher = scores.filter(s => s.big_points > totalBig).length;
  const equal  = scores.filter(s => s.big_points === totalBig).length;
  const personalBest = scores.length > 1 && higher === 0 && equal === 1;

  await persistUnlocks(user, entries);

  return {
    unlocked: entries.map(e => ({ ...toastDef(e.id, e.tier), tier: e.tier })),
    personalBest,
    isGuest: false,
  };
}

function processGuest({ earnedFeats, totalBig, balutCount }) {
  const data = loadGuest();
  const priorGames = data.stats.gamesPlayed;
  const priorBest = data.stats.best;

  // Update local lifetime stats.
  data.stats.gamesPlayed += 1;
  data.stats.lifetimeBaluts += balutCount;
  data.stats.lifetimeBigPoints += totalBig;
  const wk = weekIndex(new Date());
  if (!data.stats.weeks.includes(wk)) data.stats.weeks.push(wk);
  data.stats.best = Math.max(priorBest, totalBig);

  const entries = [];
  for (const id of earnedFeats) {
    if (!(id in data.unlocked)) entries.push({ id, tier: 0 });
  }

  // Overall collector tier (guests have no competitive badges — no identity).
  const stats = {
    gamesPlayed: data.stats.gamesPlayed,
    lifetimeBaluts: data.stats.lifetimeBaluts,
    lifetimeBigPoints: data.stats.lifetimeBigPoints,
  };
  const ot = overallTier(stats);
  if (ot > (data.unlocked.overall_progress?.tier ?? 0)) {
    entries.push({ id: 'overall_progress', tier: ot });
  }

  const now = new Date().toISOString();
  for (const e of entries) data.unlocked[e.id] = { tier: e.tier, at: now };
  saveGuest(data);

  const personalBest = priorGames > 0 && totalBig > priorBest;

  return {
    unlocked: entries.map(e => ({ ...toastDef(e.id, e.tier), tier: e.tier })),
    personalBest,
    isGuest: true,
  };
}

// ─── Profile aggregation ──────────────────────────────────────────────────────

const COMPETITIVE_IDS = ['first_blood', 'top_of_the_week', 'top_of_the_month'];

function buildTrackers(stats, overall = 0) {
  // Every tracker aims at the SAME tier the collector is working toward
  // (overall + 1) — not each metric's own next tier. A metric that already
  // clears that threshold shows a full bar + checkmark and waits for the
  // laggards; the bars only advance to the following tier once all three
  // metrics lift the overall collector tier.
  const target = overall + 1;
  return PROGRESSION.map(d => {
    const value   = stats[d.metric] ?? 0;
    const curTier = d.tiers.find(t => t.tier === overall);  // undefined at overall 0
    const tgtTier = d.tiers.find(t => t.tier === target);   // undefined once maxed
    const prev      = curTier ? curTier.threshold : 0;       // band lower bound
    const next      = tgtTier ? tgtTier.threshold : null;    // band upper bound
    const nextLabel = tgtTier ? tgtTier.label : null;
    const done      = next != null && value >= next;         // met target, waiting on others
    return { id: d.id, icon: d.icon, name: d.name, value, prev, next, nextLabel, done };
  });
}

function buildOverall(current) {
  return { current, tiers: TIERS.map(t => ({ ...t, reached: t.tier <= current })) };
}

/**
 * Everything the profile achievements UI needs for a logged-in user: feat /
 * competitive earned-state, the overall collector tier, per-metric trackers,
 * and both streaks.
 */
export async function loadProfileAchievements(user, username) {
  const empty = {
    feats: FEATS.map(d => ({ ...d, earned: false })),
    competitive: COMPETITIVE_IDS.map(id => ({ ...DEF_BY_ID[id], earned: false })),
    overall: buildOverall(0),
    trackers: buildTrackers({}),
    play: { current: 0, longest: 0 },
    leaderboard: { current: 0, longest: 0 },
  };
  if (!user?.id || !supabase) return empty;

  const since = new Date(Date.now() - 26 * 7 * 24 * 60 * 60 * 1000);
  const [unlockedMap, scores, comp] = await Promise.all([
    fetchUnlockedRows(user.id),
    fetchUserScores(user.id),
    fetchCompetitive(username, since),
  ]);

  const stats = computeStats(scores);

  const feats = FEATS.map(d => ({
    ...d, earned: d.id in unlockedMap, at: unlockedMap[d.id]?.at,
  }));
  const competitive = COMPETITIVE_IDS.map(id => ({
    ...DEF_BY_ID[id], earned: id in unlockedMap, at: unlockedMap[id]?.at,
  }));

  const now = new Date();
  const ot = overallTier(stats);
  return {
    feats,
    competitive,
    overall: buildOverall(ot),
    trackers: buildTrackers(stats, ot),
    play: playStreak(scores, now),
    leaderboard: streakFromWeekSet(new Set(comp.present), weekIndex(now)),
  };
}
