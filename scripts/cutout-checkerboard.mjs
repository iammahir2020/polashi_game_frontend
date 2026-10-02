// Turns an image with a "transparent" checkerboard painted into it (what image
// generators often export) into a real transparent PNG.
//
//   node scripts/cutout-checkerboard.mjs <input> <output.png> [options]
//
// Options:
//   --crop L,T,W,H     cut this region out of the input first (e.g. one of two
//                      objects in a single image, or to leave out a shadow)
//   --size N           centre the result on an N x N canvas (default 1024)
//   --canvas WxH       centre the result on a W x H canvas instead
//   --min-light N      lightest checker square must be at least this bright
//                      (0-255, default 165; use ~60 for dark checkerboards)
//   --max-chroma N     how grey a pixel must be to count as checkerboard
//                      (default 24; lower is stricter)
//   --holes N          also clear checkerboard patches of at least N pixels
//                      that are enclosed by the object (e.g. between a banner
//                      and its crossbar), not just what touches the border
//
// How: flood-fill from the image border across light, colourless pixels (the
// checkerboard's squares) to find the background, so highlights inside the
// object survive because they aren't connected to the border. The edge is
// pulled in by a pixel to drop the JPEG halo, then softened. The result is
// trimmed and centred on the canvas with a 3% margin.

import sharp from 'sharp';

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const [input, output, legacySize] = positional;
if (!input || !output) {
  console.error('usage: node scripts/cutout-checkerboard.mjs <input> <output.png> [--crop L,T,W,H] [--size N | --canvas WxH] [--min-light N] [--max-chroma N]');
  process.exit(1);
}

const size = Number(flag('size') ?? legacySize) || 1024;
const [canvasW, canvasH] = (flag('canvas') ?? `${size}x${size}`).split('x').map(Number);
const MAX_CHROMA = Number(flag('max-chroma') ?? 24);
const MIN_LIGHT = Number(flag('min-light') ?? 165);
const crop = flag('crop')?.split(',').map(Number);
const HOLES_MIN = Number(flag('holes') ?? 0);

let source = sharp(input).removeAlpha();
if (crop) source = source.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const n = W * H;

// A pixel can be background if it's light enough and almost colourless.
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

// Optionally clear enclosed checkerboard patches too.
if (HOLES_MIN > 0) {
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  for (let start = 0; start < n; start++) {
    if (!candidate[start] || background[start] || seen[start]) continue;
    let top = 0;
    const members = [];
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const i = stack[--top];
      members.push(i);
      const x = i % W, y = (i / W) | 0;
      const visit = (j) => {
        if (candidate[j] && !background[j] && !seen[j]) {
          seen[j] = 1;
          stack[top++] = j;
        }
      };
      if (x > 0) visit(i - 1);
      if (x < W - 1) visit(i + 1);
      if (y > 0) visit(i - W);
      if (y < H - 1) visit(i + W);
    }
    if (members.length >= HOLES_MIN) for (const i of members) background[i] = 1;
  }
}

// Grow the background by 2 px to remove the light fringe around the object.
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
const margin = Math.round(Math.min(canvasW, canvasH) * 0.03);
await sharp(trimmed)
  .resize(canvasW - margin * 2, canvasH - margin * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: margin, bottom: margin, left: margin, right: margin, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(output);

const removed = bg.reduce((a, v) => a + v, 0) / n;
console.log(`${output}: background ${(removed * 100).toFixed(1)}% of the image removed`);
