export const NUM_DICE = 5;
export const MAX_ROLLS = 3;
export const NUM_COLUMNS = 4;

export const CATEGORIES = [
  'fours',
  'fives',
  'sixes',
  'straight',
  'fullHouse',
  'choice',
  'balut',
];

export const CATEGORY_LABELS = {
  fours:     'Fours',
  fives:     'Fives',
  sixes:     'Sixes',
  straight:  'Straight',
  fullHouse: 'Full House',
  choice:    'Choice',
  balut:     'Balut',
};

export const CATEGORY_SHORT = {
  fours:     '4s',
  fives:     '5s',
  sixes:     '6s',
  straight:  'St',
  fullHouse: 'FH',
  choice:    'Ch',
  balut:     'Ba',
};

// Big point thresholds and values
export const BIG_POINT_RULES = {
  fours:     { type: 'sum',   threshold: 52,  points: 2 },
  fives:     { type: 'sum',   threshold: 65,  points: 2 },
  sixes:     { type: 'sum',   threshold: 78,  points: 2 },
  straight:  { type: 'filled', threshold: null, points: 4 },
  fullHouse: { type: 'filled', threshold: null, points: 3 },
  choice:    { type: 'sum',   threshold: 100, points: 2 },
  balut:     { type: 'perBalut', threshold: null, points: 2 },
};

// Small point bonus thresholds
export const BONUS_BREAKPOINTS = [
  { min: 0,   max: 299, bonus: -2 },
  { min: 300, max: 349, bonus: -1 },
  { min: 350, max: 399, bonus:  0 },
  { min: 400, max: 449, bonus: +1 },
  { min: 450, max: 499, bonus: +2 },
  { min: 500, max: 549, bonus: +3 },
];
