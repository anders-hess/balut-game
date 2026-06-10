// One-off: generate PWA icon PNGs from icon.jpg. Run with `node scripts/gen-pwa-icons.mjs`.
// Requires sharp (install transiently: `npm install --no-save sharp`).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'icon.jpg');
const out = join(root, 'public', 'icons');
mkdirSync(out, { recursive: true });

// The source art is a rounded terracotta tile on a cream margin. Detect the
// terracotta tile's bounding box so we can crop the cream away.
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const isTerracotta = (r, g, b) => r > 140 && r < 230 && g > 80 && g < 170 && b < 130 && r - b > 40;
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    if (isTerracotta(data[i], data[i + 1], data[i + 2])) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
console.log('terracotta tile box:', box);

// Average terracotta colour sampled from the tile centre — used to fill the
// rounded corners on the maskable icon so it reads as a full square.
const cx = Math.round(minX + box.width * 0.12); // left strip — solid terracotta, clear of the 'b'
const cy = Math.round(minY + box.height * 0.5);
const ci = (cy * W + cx) * C;
const bg = { r: data[ci], g: data[ci + 1], b: data[ci + 2], alpha: 1 };
console.log('tile bg colour:', bg);

const tile = await sharp(src).extract(box).png().toBuffer();

// "any" icons: the rounded tile, edge to edge.
const jobs = [
  { size: 192, file: 'icon-192.png' },
  { size: 512, file: 'icon-512.png' },
  { size: 180, file: 'apple-touch-icon.png' },
];
for (const j of jobs) {
  await sharp(tile).resize(j.size, j.size, { fit: 'cover' }).png().toFile(join(out, j.file));
  console.log('wrote', j.file);
}

// Maskable: inset past the tile's rounded corners so the field is pure
// terracotta, then resize edge-to-edge. The 'b' stays well inside the central
// 80% safe zone, and a launcher's circle/squircle mask only ever clips terracotta.
const insetX = Math.round(box.width * 0.12);
const insetY = Math.round(box.height * 0.12);
const innerBox = {
  left: box.left + insetX,
  top: box.top + insetY,
  width: box.width - insetX * 2,
  height: box.height - insetY * 2,
};
await sharp(src)
  .extract(innerBox)
  .resize(512, 512, { fit: 'cover' })
  .flatten({ background: bg })
  .png()
  .toFile(join(out, 'icon-512-maskable.png'));
console.log('wrote icon-512-maskable.png');
