// Generates every derived image in public/ from the source art in art-src/.
//
//   npm run assets
//
// Re-runnable: outputs are always rebuilt from sources, never from earlier
// outputs. When a source in art-src/ is missing, that step is skipped and the
// current file in public/ is kept. `npm run art` draws the sources.
//
// Text is rendered with Pango via sharp's `text` input, using the TTFs in
// scripts/fonts/ (all SIL OFL). Each text run gets one font file, which is why
// the Latin title and the Bangla name are rendered separately and composited.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const ART = path.join(ROOT, 'art-src');
const PUBLIC = path.join(ROOT, 'public');
const FONTS = path.join(ROOT, 'scripts', 'fonts');

const BG_COLOR = '#0a0a0a';
const GOLD = '#e7c77d';
const SIZE_BUDGET = 300 * 1024;

const report = [];

function exists(file) {
  return fs.existsSync(file);
}

function firstExisting(...files) {
  return files.find(exists) ?? null;
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll('\\', '/');
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function write(name, buffer) {
  const file = path.join(PUBLIC, name);
  const before = exists(file) ? fs.statSync(file).size : null;
  fs.writeFileSync(file, buffer);
  report.push({ name, before, after: buffer.length });
}

// Lowers quality until the encoded image fits the byte budget.
async function encodeUnder(pipeline, format, budget, startQuality) {
  for (let quality = startQuality; quality >= 40; quality -= 5) {
    const buffer = await pipeline.clone()[format]({ quality, mozjpeg: true }).toBuffer();
    if (buffer.length <= budget) return buffer;
  }
  throw new Error(`Could not encode ${format} under ${kb(budget)}`);
}

async function renderText(text, { font, size, fontfile, color = GOLD, weight = 'normal' }) {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${color}" font_weight="${weight}">${escaped}</span>`,
      font: `${font} ${size}`,
      fontfile: path.join(FONTS, fontfile),
      rgba: true,
      dpi: 72,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// --- Background --------------------------------------------------------------
// The UI renders the title in HTML (GameHeader), so the background stays
// textless.
async function buildBackground() {
  const source = path.join(ART, 'key-art-portrait.png');
  if (!exists(source)) {
    console.warn('! background: art-src/key-art-portrait.png missing, skipped');
    return;
  }
  console.log(`background  <- ${rel(source)}`);

  const base = sharp(source).resize({ width: 1080, withoutEnlargement: true });
  write('polashi_bg.webp', await encodeUnder(base, 'webp', SIZE_BUDGET, 80));
  write('polashi_bg.jpg', await encodeUnder(base, 'jpeg', SIZE_BUDGET, 78));
}

// --- Open Graph image (1200x630) --------------------------------------------
async function buildOgImage() {
  const finished = path.join(ART, 'og-image.png');
  const wide = path.join(ART, 'key-art-wide.png');
  const W = 1200;
  const H = 630;

  // A finished share image (title already painted in) is used as it is,
  // only resized and compressed; no second title on top.
  if (exists(finished)) {
    console.log(`og-image    <- ${rel(finished)} (finished art, no overlay)`);
    const base = sharp(finished).resize(W, H, { fit: 'cover', position: 'attention' });
    write('og-image.jpg', await encodeUnder(base, 'jpeg', SIZE_BUDGET, 82));
    return;
  }

  if (!exists(wide)) {
    console.warn('! og-image: art-src/key-art-wide.png missing, skipped');
    return;
  }
  console.log(`og-image    <- ${rel(wide)}`);
  const base = sharp(wide).resize(W, H, { fit: 'cover' });

  // Darken the left side so the title stays readable on any art.
  const shade = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#000" stop-opacity="0.85"/>
          <stop offset="0.55" stop-color="#000" stop-opacity="0.45"/>
          <stop offset="1" stop-color="#000" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
    </svg>`);

  const title = await renderText('The Battle of Polashi', {
    font: 'Cinzel', size: 66, fontfile: 'Cinzel.ttf', weight: 'bold',
  });
  const bangla = await renderText('পলাশী', {
    font: 'Noto Serif Bengali', size: 64, fontfile: 'NotoSerifBengali.ttf', weight: 'bold',
  });
  const subtitle = await renderText('Online multiplayer social deduction', {
    font: 'EB Garamond', size: 34, fontfile: 'EBGaramond.ttf', color: '#f2ead8',
  });

  const left = 64;
  const gap = 14;
  const blockHeight = title.height + gap + bangla.height + gap * 2 + subtitle.height;
  let top = Math.round((H - blockHeight) / 2);
  const layers = [{ input: shade, top: 0, left: 0 }];
  for (const [layer, spaceAfter] of [[title, gap], [bangla, gap * 2], [subtitle, 0]]) {
    layers.push({ input: layer.data, top, left });
    top += layer.height + spaceAfter;
  }

  const composed = sharp(await base.composite(layers).png().toBuffer());
  write('og-image.jpg', await encodeUnder(composed, 'jpeg', SIZE_BUDGET, 82));
}

// --- Icons ------------------------------------------------------------------
async function iconOnCanvas(source, size, { scale, background }) {
  const inner = Math.round(size * scale);
  const seal = await sharp(source)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: seal, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
}

// Minimal ICO container with embedded PNGs (supported by every current browser).
function toIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);

  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((png) => png.data)]);
}

async function buildIcons() {
  const source = firstExisting(path.join(ART, 'seal-nawab.png'), path.join(PUBLIC, 'Nawab.png'));
  console.log(`icons       <- ${rel(source)}`);
  // Read once into memory: Nawab.png may itself be rewritten by buildGamePieces().
  const input = fs.readFileSync(source);
  const opaque = { r: 10, g: 10, b: 10, alpha: 1 };

  const icoSizes = [16, 32, 48];
  const icoPngs = [];
  for (const size of icoSizes) {
    icoPngs.push({ size, data: await iconOnCanvas(input, size, { scale: 1 }) });
  }
  write('favicon.ico', toIco(icoPngs));
  write('favicon-32.png', icoPngs[1].data);
  write('apple-touch-icon.png', await iconOnCanvas(input, 180, { scale: 0.82, background: opaque }));
  write('pwa-192.png', await iconOnCanvas(input, 192, { scale: 1 }));
  write('pwa-512.png', await iconOnCanvas(input, 512, { scale: 1 }));
  // Maskable icons get cropped to a circle of 80% diameter; keep the seal inside it.
  write('pwa-512-maskable.png', await iconOnCanvas(input, 512, { scale: 0.66, background: opaque }));
}

// --- Seals, vote tokens and mission cards ------------------------------------
// Each output keeps its current size so no layout changes. Observer.png had no
// file before, so it takes the faction seals' size.
async function buildGamePieces() {
  const targets = [
    { source: 'seal-nawab.png', outputs: ['Nawab.png'] },
    { source: 'seal-eic.png', outputs: ['EIC.png'] },
    { source: 'seal-observer.png', outputs: ['Observer.png'], size: { width: 193, height: 189 } },
    // Council vote: approve is the Nawab seal, reject the Company seal.
    { source: 'seal-nawab.png', outputs: ['green_seal.png'] },
    { source: 'seal-eic.png', outputs: ['red_seal.png'] },
    { source: 'banner-nawab.png', outputs: ['green_card.png'] },
    { source: 'banner-eic.png', outputs: ['red_card.png'] },
  ];

  for (const { source, outputs, size } of targets) {
    const file = path.join(ART, source);
    if (!exists(file)) {
      console.warn(`! pieces: art-src/${source} missing, kept ${outputs.join(' / ')}`);
      continue;
    }
    console.log(`pieces      <- ${rel(file)}`);
    for (const name of outputs) {
      const target = path.join(PUBLIC, name);
      const { width, height } = size ?? (await sharp(target).metadata());
      const buffer = await sharp(file)
        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9, palette: true, quality: 90 })
        .toBuffer();
      write(name, buffer);
    }
  }
}

// --- Splash video (optional: needs ffmpeg) ------------------------------------
// A slow push-in with two lightning flashes, 8 s loop, 720x1280, no audio.
// With key-art-portrait-calm.png the flashes cut to the scene with lightning;
// with only key-art-portrait.png they briefly brighten that one image.
// Uses $FFMPEG_PATH or ffmpeg on PATH.
function buildVideo() {
  const bolt = path.join(ART, 'key-art-portrait.png');
  const calmFile = path.join(ART, 'key-art-portrait-calm.png');
  const singleImage = !exists(calmFile);
  const calm = singleImage ? bolt : calmFile;
  if (!exists(bolt)) {
    console.warn('! video: portrait art missing, kept polashi_bg.mp4');
    return;
  }
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  if (spawnSync(ffmpeg, ['-version']).status !== 0) {
    console.warn('! video: ffmpeg not found (set FFMPEG_PATH), kept polashi_bg.mp4');
    return;
  }
  console.log(`video       <- ${singleImage ? `${rel(bolt)} (flash by brightening)` : `${rel(calm)} + ${rel(bolt)}`}`);

  const flash = "if(between(mod(T,4),1.2,1.42),1,if(between(mod(T,4),1.58,1.7),0.7,0))";
  const filter = [
    '[0]scale=864:1296,setsar=1[a]',
    singleImage
      ? '[1]scale=864:1296,setsar=1,eq=brightness=0.16:contrast=1.12:saturation=1.1[b]'
      : '[1]scale=864:1296,setsar=1[b]',
    `[a][b]blend=all_expr='A*(1-${flash})+B*${flash}'[m]`,
    "[m]scale=w='trunc(864*(1+0.05*t/8)/2)*2':h=-2:eval=frame,crop=720:1280,fps=24,format=yuv420p[v]",
  ].join(';');
  const out = path.join(PUBLIC, 'polashi_bg.mp4');
  const tmp = `${out}.tmp.mp4`;
  const result = spawnSync(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', '24', '-t', '8', '-i', calm,
    '-loop', '1', '-framerate', '24', '-t', '8', '-i', bolt,
    '-filter_complex', filter, '-map', '[v]', '-t', '8', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-movflags', '+faststart', tmp,
  ], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.warn('! video: ffmpeg failed, kept polashi_bg.mp4');
    if (exists(tmp)) fs.rmSync(tmp);
    return;
  }
  const before = fs.statSync(out).size;
  fs.renameSync(tmp, out);
  report.push({ name: 'polashi_bg.mp4', before, after: fs.statSync(out).size });
}

// --- Compress the remaining hand-made PNGs -----------------------------------
// Only rewrites a file when the result is meaningfully smaller, so repeated runs
// settle instead of re-quantizing the same image over and over.
async function compressPngs(skip) {
  const files = fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.png') && !skip.has(f));
  for (const name of files) {
    const file = path.join(PUBLIC, name);
    const original = fs.readFileSync(file);
    const compressed = await sharp(original)
      .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
      .toBuffer();
    if (compressed.length < original.length * 0.9) {
      write(name, compressed);
    }
  }
}

async function run() {
  await buildBackground();
  await buildOgImage();
  await buildGamePieces();
  await buildIcons();
  await compressPngs(new Set(report.map((entry) => entry.name)));
  buildVideo();

  console.log('\nfile                     before       after');
  for (const { name, before, after } of report) {
    const flag = after > SIZE_BUDGET && !name.endsWith('.mp4') ? '  (over 300 KB)' : '';
    console.log(`${name.padEnd(24)} ${(before === null ? 'new' : kb(before)).padStart(10)}  ${kb(after).padStart(10)}${flag}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
