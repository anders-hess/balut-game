import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { callGemini, stripDataUrl } from './src/scanner/gemini/extract.js'

// Dev-only middleware so POST /api/scan works under `vite` on localhost:5173,
// mirroring the Vercel serverless function in api/scan.js. Reads the (non-VITE_)
// GEMINI_API_KEY from .env.local via loadEnv.
function devScanApi(env) {
  return {
    name: 'dev-scan-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/scan', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: 'Method not allowed.' }));
        }
        const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        res.setHeader('Content-Type', 'application/json');
        if (!apiKey) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: 'Dev server is missing GEMINI_API_KEY in .env.local.' }));
        }
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const { image, mimeType } = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          if (!image) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing "image" in request body.' }));
          }
          const result = await callGemini({
            imageBase64: stripDataUrl(image),
            mimeType: mimeType || 'image/jpeg',
            apiKey,
            model: env.GEMINI_MODEL || process.env.GEMINI_MODEL,
          });
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err?.message ?? 'Scan failed.' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // '' → load all vars, incl. non-VITE_
  return {
    plugins: [react(), devScanApi(env)],
  };
})
