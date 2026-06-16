// Browser-side helper: POST the captured canvas to /api/scan and return the
// Gemini structured result. The API key never touches the client — the function
// at api/scan.js (prod) / the Vite dev middleware (local) holds it.

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{ rows: Array }>}
 */
export async function scanScorecard(canvas) {
  const image = canvas.toDataURL('image/jpeg', 0.9);

  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, mimeType: 'image/jpeg' }),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Scan failed: HTTP ${res.status} ${res.statusText}`);
  }
  if (!res.ok) throw new Error(data?.error || `Scan failed: HTTP ${res.status}`);
  return data;
}
