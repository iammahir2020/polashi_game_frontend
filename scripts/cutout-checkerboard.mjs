// Turns an image with a "transparent" checkerboard painted into it (what image
// generators often export as JPG) into a real transparent PNG.
//
//   node scripts/cutout-checkerboard.mjs <input.jpg|png> <output.png> [size]
//
// How: flood-fill from the image border across light, colourless pixels (the
// checkerboard's white and grey squares) to find the background, so light
// highlights inside the object survive because they aren't connected to the
// border. The edge is pulled in by a pixel to drop the JPEG halo, then softened.
// The result is trimmed and centred on a square canvas (default 1024 px).

import sharp from 'sharp';

const [, , input, output, sizeArg] = process.argv;
if (!input || !output) {
  console.error('usage: node scripts/cutout-checkerboard.mjs <input> <output.png> [size]');
  process.exit(1);
}
const SIZE = Number(sizeArg) || 1024;

// A pixel can be background if it's light and almost colourless.
const MAX_CHROMA = 24;
const MIN_LIGHT = 165;

const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const n = W * H;

const candidate = new Uint8Array(n);
for (let i = 0; i < n; i++) {
  const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  candidate[i] = max - min <= MAX_CHROMA && min >= MIN_LIGHT ? 1 : 0;
}

// Flood fill from every border pixel.
const background = new Uint8Array(n);
const queue = new Int32Array(n);
let head = 0, tail = 0;
const seed = (i) => {
  if (candidate[i] && !background[i]) {
    background[i] = 1;
    queue[tail++] = i;
  }
};
for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
while (head < tail) {
  const i = queue[head++];
  const x = i % W, y = (i / W) | 0;
  if (x > 0) seed(i - 1);
  if (x < W - 1) seed(i + 1);
  if (y > 0) seed(i - W);
  if (y < H - 1) seed(i + W);
}

// Grow the background by 2 px to remove the light JPEG fringe around the object.
let bg = background;
for (let pass = 0; pass < 2; pass++) {
  const grown = bg.slice();
  for (let i = 0; i < n; i++) {
    if (bg[i]) continue;
    const x = i % W, y = (i / W) | 0;
    if ((x > 0 && bg[i - 1]) || (x < W - 1 && bg[i + 1]) || (y > 0 && bg[i - W]) || (y < H - 1 && bg[i + W])) grown[i] = 1;
  }
  bg = grown;
}

// Alpha mask, softened for an anti-aliased edge.
const alpha = Buffer.alloc(n);
for (let i = 0; i < n; i++) alpha[i] = bg[i] ? 0 : 255;
const softAlpha = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
  .blur(0.8)
  .toColourspace('b-w')
  .extractChannel(0)
  .raw()
  .toBuffer();
if (softAlpha.length !== n) throw new Error(`alpha mask has ${softAlpha.length} bytes, expected ${n}`);

const rgba = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  rgba[i * 4] = data[i * 3];
  rgba[i * 4 + 1] = data[i * 3 + 1];
  rgba[i * 4 + 2] = data[i * 3 + 2];
  rgba[i * 4 + 3] = softAlpha[i];
}

const trimmed = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .trim({ threshold: 1 })
  .png()
  .toBuffer();
const margin = Math.round(SIZE * 0.03);
await sharp(trimmed)
  .resize(SIZE - margin * 2, SIZE - margin * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: margin, bottom: margin, left: margin, right: margin, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(output);

const removed = bg.reduce((a, v) => a + v, 0) / n;
console.log(`${output}: background ${(removed * 100).toFixed(1)}% of the image removed`);
