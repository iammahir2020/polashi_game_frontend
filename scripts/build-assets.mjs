// Generates every derived image in public/ from the source art in art-src/.
//
//   npm run assets
//
// Re-runnable: outputs are always rebuilt from sources, never from earlier
// outputs. When a source in art-src/ is missing, the step falls back to the
// legacy art (or skips) and says so, so the script works before and after the
// new art lands.
//
// Text is rendered with Pango via sharp's `text` input, using the TTFs in
// scripts/fonts/ (all SIL OFL). Each text run gets one font file, which is why
// the Latin title and the Bangla name are rendered separately and composited.

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
// textless. The legacy fallback already has a title painted into it.
async function buildBackground() {
  const source = firstExisting(
    path.join(ART, 'key-art-portrait.png'),
    path.join(ART, 'legacy', 'polashi_bg_high_res.png'),
  );
  if (!source) {
    console.warn('! background: no source art found, skipped');
    return;
  }
  console.log(`background  <- ${rel(source)}`);

  const base = sharp(source).resize({ width: 1080, withoutEnlargement: true });
  write('polashi_bg.webp', await encodeUnder(base, 'webp', SIZE_BUDGET, 80));
  write('polashi_bg.jpg', await encodeUnder(base, 'jpeg', SIZE_BUDGET, 78));
}

// --- Open Graph image (1200x630) --------------------------------------------
async function buildOgImage() {
  const wide = path.join(ART, 'key-art-wide.png');
  const legacy = path.join(ART, 'legacy', 'polashi_bg_high_res.png');
  const W = 1200;
  const H = 630;

  let base;
  if (exists(wide)) {
    console.log(`og-image    <- ${rel(wide)}`);
    base = sharp(wide).resize(W, H, { fit: 'cover' });
  } else if (exists(legacy)) {
    // Interim: crop the battlefield band out of the portrait art. This band
    // sits between the seals (which carry the wrong "1814" date) and the
    // painted-in title, so neither ends up in the share image.
    console.log(`og-image    <- ${rel(legacy)} (battlefield crop; add art-src/key-art-wide.png to replace)`);
    const meta = await sharp(legacy).metadata();
    const cropHeight = Math.round((meta.width * H) / W);
    const top = Math.round(meta.height * 0.45);
    base = sharp(legacy)
      .extract({ left: 0, top, width: meta.width, height: cropHeight })
      .resize(W, H);
  } else {
    console.warn('! og-image: no source art found, skipped');
    return;
  }

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
  // Read once into memory: Nawab.png may itself be rewritten by buildSeals().
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

// --- Faction seals (only when new seal art exists) ---------------------------
async function buildSeals() {
  const targets = [
    { source: 'seal-nawab.png', outputs: ['green_seal.png', 'Nawab.png'] },
    { source: 'seal-eic.png', outputs: ['red_seal.png', 'EIC.png'] },
  ];

  for (const { source, outputs } of targets) {
    const file = path.join(ART, source);
    if (!exists(file)) {
      console.warn(`! seals: art-src/${source} missing, kept ${outputs.join(' / ')}`);
      continue;
    }
    console.log(`seals       <- ${rel(file)}`);
    for (const name of outputs) {
      // Keep each file's current dimensions so no layout changes.
      const { width, height } = await sharp(path.join(PUBLIC, name)).metadata();
      const buffer = await sharp(file)
        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9, palette: true, quality: 90 })
        .toBuffer();
      write(name, buffer);
    }
  }
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
  await buildSeals();
  await buildIcons();
  await compressPngs(new Set(report.map((entry) => entry.name)));

  console.log('\nfile                     before       after');
  for (const { name, before, after } of report) {
    const flag = after > SIZE_BUDGET ? '  (over 300 KB)' : '';
    console.log(`${name.padEnd(24)} ${(before === null ? 'new' : kb(before)).padStart(10)}  ${kb(after).padStart(10)}${flag}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
