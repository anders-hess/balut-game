// Calls Google's Gemini (Generative Language) REST API to read a scorecard photo.
// Pure fetch — works in a Vercel Node function, the Vite dev middleware, and a
// plain Node bench script. Never import this into the browser bundle: it needs
// the secret API key, which must stay server-side.

import { DEFAULT_MODEL, EXTRACTION_PROMPT, RESPONSE_SCHEMA } from './prompt.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Pull the server's suggested wait (RetryInfo "retryDelay": "11s") if present.
function retryDelayMs(errJson, fallback) {
  const detail = errJson?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
  const s = detail?.retryDelay;
  const secs = s ? parseFloat(String(s).replace('s', '')) : NaN;
  return Number.isFinite(secs) ? Math.min(secs * 1000 + 500, 40000) : fallback;
}

/**
 * @param {object}  opts
 * @param {string}  opts.imageBase64  Raw base64 (no data: prefix)
 * @param {string} [opts.mimeType]    Defaults to image/jpeg
 * @param {string}  opts.apiKey       Gemini API key (server-side secret)
 * @param {string} [opts.model]       Override model id
 * @returns {Promise<{ rows: Array }>}  Parsed structured result
 */
export async function callGemini({ imageBase64, mimeType = 'image/jpeg', apiKey, model = DEFAULT_MODEL, maxRetries = 2 }) {
  // Strip a BOM / whitespace / any non-printable-ASCII the key may have picked up
  // from an env file or CLI pipe — HTTP header values must be a ByteString (0–255),
  // and a stray U+FEFF (65279) otherwise throws when set as a header.
  apiKey = (apiKey ?? '').replace(/[^\x20-\x7E]/g, '').trim();
  if (!apiKey) throw new Error('Missing Gemini API key (GEMINI_API_KEY).');
  if (!imageBase64) throw new Error('No image data supplied to callGemini.');

  const url = `${API_BASE}/${model}:generateContent`;
  const body = {
    contents: [{
      parts: [
        { text: EXTRACTION_PROMPT },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ],
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let res;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });

    if (res.ok) break;

    let detail = `${res.status} ${res.statusText}`, errJson = null;
    try { errJson = await res.json(); detail = errJson?.error?.message ?? detail; } catch { /* keep status line */ }

    // 429 = rate/quota, 503 = transient overload — back off and retry.
    if ((res.status === 429 || res.status === 503) && attempt < maxRetries) {
      await sleep(retryDelayMs(errJson, 2000 * (attempt + 1)));
      continue;
    }
    throw new Error(`Gemini HTTP ${detail}`);
  }

  const data = await res.json();

  const blocked = data?.promptFeedback?.blockReason;
  if (blocked) throw new Error(`Gemini blocked the request: ${blocked}`);

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content.');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned malformed JSON.');
  }
  if (!parsed || !Array.isArray(parsed.rows)) {
    throw new Error('Gemini response missing "rows".');
  }
  return parsed;
}

/** Strip a `data:image/...;base64,` prefix if present, returning raw base64. */
export function stripDataUrl(dataUrl) {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}
