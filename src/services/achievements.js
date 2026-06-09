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
import { FEATS, PROGRESSION, STREAKS } from '../logic/achievements/definitions.js';
import { evaluateFeats, computeStats, evaluateProgression } from '../logic/achievements/evaluate.js';
import { weekIndex, streakFromWeekSet, playStreak } from '../logic/achievements/streaks.js';

const GUEST_KEY = 'balut_achievements';

const DEF_BY_ID = {};
for (const d of [...FEATS, ...PROGRESSION, ...STREAKS]) DEF_BY_ID[d.id] = d;
export function getAchievementDef(id) { return DEF_BY_ID[id]; }

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
 * Weeks (by index) in which `username`'s logged-in scores made the weekly Top 10,
 * ranked across ALL players. Bounded to the last `weeksBack` weeks.
 */
async function fetchLeaderboardWeeks(username, weeksBack = 26) {
  if (!supabase || !username) return { present: [], everTop1: false };
  const since = new Date(Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from('scores')
    .select('player_name, big_points, small_points, balut_count, created_at, is_guest')
    .gte('created_at', since.toISOString());
  if (error) { console.error('fetchLeaderboardWeeks:', error); return { present: [], everTop1: false }; }

  const byWeek = new Map();
  for (const r of data ?? []) {
    const wk = weekIndex(new Date(r.created_at));
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk).push(r);
  }

  const isMe = (r) => !r.is_guest && r.player_name === username;
  const present = [];
  let everTop1 = false;
  for (const [wk, rows] of byWeek) {
    rows.sort((a, b) =>
      b.big_points - a.big_points ||
      b.small_points - a.small_points ||
      b.balut_count - a.balut_count);
    const top10 = rows.slice(0, 10);
    if (top10.some(isMe)) present.push(wk);
    if (top10[0] && isMe(top10[0])) everTop1 = true;
  }
  return { present, everTop1 };
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

  const newEntries = [];

  // Feats (tier 0, one-time).
  for (const id of earnedFeats) {
    if (!(id in unlockedMap)) newEntries.push({ id, tier: 0, isMilestone: false });
  }

  // Progression (tiered) — `scores` already includes the just-saved game.
  const stats = computeStats(scores);
  const progTiers = evaluateProgression(stats);
  for (const [id, tier] of Object.entries(progTiers)) {
    if (tier > (unlockedMap[id]?.tier ?? 0)) {
      newEntries.push({ id, tier, isMilestone: id === 'games_played' || id === 'lifetime_baluts' });
    }
  }

  // Competitive — match this user's logged-in scores against the weekly board.
  const { present, everTop1 } = await fetchLeaderboardWeeks(username, 1);
  if (present.length > 0 && !('first_blood' in unlockedMap)) {
    newEntries.push({ id: 'first_blood', tier: 0, isMilestone: false });
  }
  if (everTop1 && !('top_of_the_week' in unlockedMap)) {
    newEntries.push({ id: 'top_of_the_week', tier: 0, isMilestone: false });
  }

  // Personal best: strictly the unique highest grand total (suppress on 1st game).
  const higher = scores.filter(s => s.big_points > totalBig).length;
  const equal  = scores.filter(s => s.big_points === totalBig).length;
  const personalBest = scores.length > 1 && higher === 0 && equal === 1;

  await persistUnlocks(user, newEntries);

  return {
    unlocked: newEntries.map(e => ({ ...DEF_BY_ID[e.id], tier: e.tier, isMilestone: e.isMilestone })),
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

  const newEntries = [];
  for (const id of earnedFeats) {
    if (!(id in data.unlocked)) newEntries.push({ id, tier: 0, isMilestone: false });
  }

  const stats = {
    gamesPlayed: data.stats.gamesPlayed,
    lifetimeBaluts: data.stats.lifetimeBaluts,
    lifetimeBigPoints: data.stats.lifetimeBigPoints,
    weeksActive: data.stats.weeks.length,
  };
  const progTiers = evaluateProgression(stats);
  for (const [id, tier] of Object.entries(progTiers)) {
    if (tier > (data.unlocked[id]?.tier ?? 0)) {
      newEntries.push({ id, tier, isMilestone: id === 'games_played' || id === 'lifetime_baluts' });
    }
  }

  const now = new Date().toISOString();
  for (const e of newEntries) data.unlocked[e.id] = { tier: e.tier, at: now };
  saveGuest(data);

  const personalBest = priorGames > 0 && totalBig > priorBest;

  return {
    unlocked: newEntries.map(e => ({ ...DEF_BY_ID[e.id], tier: e.tier, isMilestone: e.isMilestone })),
    personalBest,
    isGuest: true,
  };
}

// ─── Profile aggregation ──────────────────────────────────────────────────────

/**
 * Everything the profile achievements UI needs for a logged-in user:
 * feat earned-state, progression tier + progress, and both streaks.
 */
export async function loadProfileAchievements(user, username) {
  const empty = {
    feats: FEATS.map(d => ({ ...d, earned: false })),
    competitive: [STREAKS[2], STREAKS[3]].map(d => ({ ...d, earned: false })),
    progression: PROGRESSION.map(d => ({ ...d, value: 0, tier: 0, next: d.tiers[0].threshold })),
    play: { current: 0, longest: 0 },
    leaderboard: { current: 0, longest: 0 },
  };
  if (!user?.id || !supabase) return empty;

  const [unlockedMap, scores, lb] = await Promise.all([
    fetchUnlockedRows(user.id),
    fetchUserScores(user.id),
    fetchLeaderboardWeeks(username),
  ]);

  const stats = computeStats(scores);

  const feats = FEATS.map(d => ({
    ...d, earned: d.id in unlockedMap, at: unlockedMap[d.id]?.at,
  }));

  const competitive = [DEF_BY_ID.first_blood, DEF_BY_ID.top_of_the_week].map(d => ({
    ...d, earned: d.id in unlockedMap, at: unlockedMap[d.id]?.at,
  }));

  const progression = PROGRESSION.map(d => {
    const value = stats[d.metric] ?? 0;
    let tier = 0;
    let next = null;
    for (const t of d.tiers) {
      if (value >= t.threshold) tier = t.tier;
      else if (next === null) next = t.threshold;
    }
    return { ...d, value, tier, next };
  });

  const now = new Date();
  const play = playStreak(scores, now);
  const leaderboard = streakFromWeekSet(new Set(lb.present), weekIndex(now));

  return { feats, competitive, progression, play, leaderboard };
}
