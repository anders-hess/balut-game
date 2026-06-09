/**
 * Weekly streak math — pure, no React.
 *
 * Weeks are identified by an absolute integer index (consecutive Mon–Sun weeks
 * differ by exactly 1), so streak detection is plain integer-adjacency on a Set.
 * The in-progress current week never breaks a streak — only a fully-elapsed
 * missed week does.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Absolute Monday-based week index for a date. Two dates in the same Mon–Sun
 * week share an index; adjacent weeks differ by 1.
 */
export function weekIndex(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();            // 0 = Sun … 6 = Sat
  const shift = day === 0 ? -6 : 1 - day; // move back to Monday
  d.setUTCDate(d.getUTCDate() + shift);
  return Math.floor(d.getTime() / WEEK_MS);
}

/**
 * Given a Set of week indices that are "present" (played / in Top 10) and the
 * current week index, return { current, longest } streak lengths.
 *
 * The current week may be empty without breaking the streak (it isn't over yet);
 * counting then resumes from the previous week.
 */
export function streakFromWeekSet(weekSet, currentWeekIdx) {
  let longest = 0;
  for (const w of weekSet) {
    if (!weekSet.has(w - 1)) {           // start of a run
      let len = 1;
      while (weekSet.has(w + len)) len++;
      if (len > longest) longest = len;
    }
  }

  let w = weekSet.has(currentWeekIdx) ? currentWeekIdx : currentWeekIdx - 1;
  let current = 0;
  while (weekSet.has(w)) { current++; w--; }

  return { current, longest };
}

/** Play streak from a list of score rows ({ created_at }). */
export function playStreak(scores, now = new Date()) {
  const weeks = new Set();
  for (const s of scores) {
    if (s?.created_at) weeks.add(weekIndex(new Date(s.created_at)));
  }
  return streakFromWeekSet(weeks, weekIndex(now));
}

/** Leaderboard streak from the week indices in which the user was in the Top 10. */
export function leaderboardStreak(presentWeekIndices, now = new Date()) {
  return streakFromWeekSet(new Set(presentWeekIndices), weekIndex(now));
}
