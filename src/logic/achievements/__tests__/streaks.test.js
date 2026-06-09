import { describe, it, expect } from 'vitest';
import { weekIndex, streakFromWeekSet, playStreak, leaderboardStreak } from '../streaks.js';

describe('weekIndex', () => {
  it('groups same Mon–Sun week to one index', () => {
    // 2026-06-08 is a Monday; 2026-06-14 the following Sunday.
    expect(weekIndex(new Date('2026-06-08T00:00:00Z')))
      .toBe(weekIndex(new Date('2026-06-14T23:59:59Z')));
  });

  it('adjacent weeks differ by exactly 1', () => {
    const a = weekIndex(new Date('2026-06-08T00:00:00Z')); // Mon
    const b = weekIndex(new Date('2026-06-15T00:00:00Z')); // next Mon
    expect(b - a).toBe(1);
  });

  it('Sunday belongs to the week that started the preceding Monday', () => {
    const sun = weekIndex(new Date('2026-06-07T12:00:00Z')); // Sunday
    const mon = weekIndex(new Date('2026-06-08T12:00:00Z')); // next day, Monday
    expect(mon - sun).toBe(1);
  });
});

describe('streakFromWeekSet', () => {
  it('counts a clean run up to the current week', () => {
    expect(streakFromWeekSet(new Set([10, 9, 8]), 10)).toEqual({ current: 3, longest: 3 });
  });

  it('keeps the streak alive when the current week is still empty', () => {
    // played weeks 9,8,7; current week 10 not yet played → streak resumes from 9
    expect(streakFromWeekSet(new Set([9, 8, 7]), 10)).toEqual({ current: 3, longest: 3 });
  });

  it('resets current to 0 after a fully-missed week', () => {
    // last play was week 8; weeks 9 and (in-progress) 10 absent → broken
    expect(streakFromWeekSet(new Set([8, 7, 6]), 10)).toEqual({ current: 0, longest: 3 });
  });

  it('tracks longest across a gap independent of current', () => {
    // run 5,4,3 (len 3) and a separate current week 10 (len 1)
    expect(streakFromWeekSet(new Set([10, 5, 4, 3]), 10)).toEqual({ current: 1, longest: 3 });
  });

  it('handles an empty set', () => {
    expect(streakFromWeekSet(new Set(), 10)).toEqual({ current: 0, longest: 0 });
  });
});

describe('playStreak', () => {
  it('derives the streak from score timestamps', () => {
    const now = new Date('2026-06-10T00:00:00Z'); // week of Mon 2026-06-08
    const scores = [
      { created_at: '2026-06-09T10:00:00Z' }, // this week
      { created_at: '2026-06-02T10:00:00Z' }, // previous week
      { created_at: '2026-05-26T10:00:00Z' }, // two weeks back
    ];
    expect(playStreak(scores, now)).toEqual({ current: 3, longest: 3 });
  });
});

describe('leaderboardStreak', () => {
  it('wraps streakFromWeekSet over present week indices', () => {
    const now = new Date('2026-06-10T00:00:00Z');
    const wk = weekIndex(now);
    expect(leaderboardStreak([wk, wk - 1, wk - 2], now))
      .toEqual({ current: 3, longest: 3 });
  });
});
