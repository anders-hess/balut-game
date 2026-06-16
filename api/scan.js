// Vercel serverless function: POST /api/scan
// Body: { image: "<base64 or data: URL>", mimeType?: "image/jpeg" }
// Returns the Gemini structured extraction result, or { error }.
// The GEMINI_API_KEY secret lives only here (server-side) — never in the bundle.

import { callGemini, stripDataUrl } from '../src/scanner/gemini/extract.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });
  }

  try {
    // Body may arrive parsed (Vercel) or as a raw string — handle both.
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
    const { image, mimeType } = body;
    if (!image) return res.status(400).json({ error: 'Missing "image" in request body.' });

    const result = await callGemini({
      imageBase64: stripDataUrl(image),
      mimeType: mimeType || 'image/jpeg',
      apiKey,
      model: process.env.GEMINI_MODEL, // undefined → DEFAULT_MODEL
    });

    return res.status(200).json(result);
  } catch (err) {
    return res.status(502).json({ error: err?.message ?? 'Scan failed.' });
  }
}
