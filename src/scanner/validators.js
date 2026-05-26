const MAX_SCORE = {
  fours: 20, fives: 25, sixes: 30,
  straight: 20, fullHouse: 30, choice: 30, balut: 50,
};

export function isInvalid(category, value) {
  if (value === null) return false;
  if (!Number.isInteger(value)) return true;
  if (value < 0) return true;
  if (value > (MAX_SCORE[category] ?? 30)) return true;
  return false;
}
