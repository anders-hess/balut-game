// Bench harness: run every photo in src/scanner/test scorecard photos/ through
// the Gemini reader and report an OBJECTIVE accuracy signal — the fraction of
// rows whose four score cells sum to the printed Øjne total (plus any illegal
// values). No hand-labelling needed: the card's own row-sums are the ground truth.
//
//   $env:PATH = "C:\Users\anhes\node\node-v22.14.0-win-x64;$env:PATH"
//   node scripts/scan-bench.mjs               # all photos
//   node scripts/scan-bench.mjs IMG_1773      # one photo (substring match)
//
// Reads GEMINI_API_KEY (and optional GEMINI_MODEL) from .env.local or the env.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { callGemini } from '../src/scanner/gemini/extract.js';
import { resultToCells, resultToRowSums } from '../src/scanner/gemini/mapResult.js';
import { isInvalid } from '../src/scanner/validators.js';
import { CATEGORIES, CATEGORY_SHORT } from '../src/logic/gameConstants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PHOTO_DIR = join(ROOT, 'src', 'scanner', 'test scorecard photos');

function loadEnvLocal() {
  try {
    const txt = readFileSync(join(ROOT, '.env.local'), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch { /* no .env.local — rely on real env */ }
}

const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

async function benchPhoto(file, apiKey, model) {
  const imageBase64 = readFileSync(file).toString('base64');
  const result = await callGemini({ imageBase64, mimeType: 'image/jpeg', apiKey, model });
  const cells = resultToCells(result);
  const rowSums = resultToRowSums(result);

  let checkable = 0, passed = 0, illegal = 0;
  console.log(`\n=== ${basename(file)} ===`);
  console.log(`  ${pad('cat', 4)} ${['#1', '#2', '#3', '#4'].map(h => padL(h, 5)).join('')}   ${padL('sum', 5)} ${padL('Øjne', 6)}  ✓`);

  CATEGORIES.forEach((cat, row) => {
    const vals = cells[row].map(c => c.value);
    const cellsStr = vals.map(v => padL(v === null ? '·' : v, 5)).join('');
    const ojne = rowSums[cat];
    const complete = vals.every(v => v !== null);
    const sum = complete ? vals.reduce((a, v) => a + v, 0) : null;

    let mark = ' ';
    if (ojne != null && complete) {
      checkable++;
      if (sum === ojne) { passed++; mark = '✓'; } else { mark = '✗'; }
    }
    vals.forEach(v => { if (isInvalid(cat, v)) illegal++; });

    console.log(`  ${pad(CATEGORY_SHORT[cat], 4)} ${cellsStr}   ${padL(sum ?? '—', 5)} ${padL(ojne ?? '—', 6)}  ${mark}`);
  });

  console.log(`  → ${passed}/${checkable} rows match Øjne` +
    (illegal ? `  ⚠ ${illegal} illegal value(s)` : ''));
  return { checkable, passed, illegal };
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY (set it in .env.local or the environment).');
    process.exit(1);
  }

  const filter = process.argv[2];
  let files = readdirSync(PHOTO_DIR)
    .filter(f => /\.(jpe?g|png)$/i.test(f))
    .filter(f => !filter || f.toLowerCase().includes(filter.toLowerCase()))
    .map(f => join(PHOTO_DIR, f));

  if (files.length === 0) { console.error('No matching photos found.'); process.exit(1); }
  console.log(`Model: ${model || 'gemini-2.5-flash (default)'} · ${files.length} photo(s)`);

  const totals = { checkable: 0, passed: 0, illegal: 0 };
  // Free tier allows ~5 requests/min; space calls ~13s apart to stay under it.
  const SPACING_MS = 13000;
  for (let i = 0; i < files.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, SPACING_MS));
    try {
      const r = await benchPhoto(files[i], apiKey, model);
      totals.checkable += r.checkable; totals.passed += r.passed; totals.illegal += r.illegal;
    } catch (err) {
      console.error(`  ERROR on ${basename(files[i])}: ${err.message}`);
    }
  }

  const pct = totals.checkable ? ((totals.passed / totals.checkable) * 100).toFixed(1) : '—';
  console.log(`\n──────────────────────────────────────`);
  console.log(`TOTAL: ${totals.passed}/${totals.checkable} checkable rows match Øjne (${pct}%)` +
    (totals.illegal ? ` · ${totals.illegal} illegal value(s)` : ''));
}

main();
