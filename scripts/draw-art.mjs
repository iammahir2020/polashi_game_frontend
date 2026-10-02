// Draws the original source art in art-src/ from code (SVG rendered by sharp).
//
//   npm run art      # writes art-src/*.png
//   npm run assets   # then derives everything in public/ from art-src/
//
// Everything here is drawn from scratch: no traced or reused artwork, and no
// text, letters or dates anywhere. The randomness is seeded, so the output is
// the same on every run. To use hand-made or generated art instead, drop PNGs
// with the same names into art-src/ and skip this step.
//
// Outputs, all with --vector only: the live versions are hand-supplied
// illustrations that this script must not overwrite (see art-src/README.md).
//   banner-nawab.png / banner-eic.png                   mission vote cards
//   seal-nawab.png / seal-eic.png / seal-observer.png   faction seals
//   key-art-portrait.png / key-art-portrait-calm.png    2:3 battlefield scene
//   key-art-wide.png                                    1.91:1 scene for the share image

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ART = path.join(process.cwd(), 'art-src');

// --- Helpers -------------------------------------------------------------------

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (value) => +value.toFixed(2);
const lerp = (a, b, t) => a + (b - a) * t;

let idCounter = 0;
const uid = (name) => `${name}${++idCounter}`;

function mixColor(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `#${pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, '0')).join('')}`;
}

// Closed Catmull-Rom spline through the points, as cubic Beziers.
function smoothClosed(points) {
  const count = points.length;
  let d = `M${n(points[0][0])},${n(points[0][1])}`;
  for (let i = 0; i < count; i++) {
    const p0 = points[(i - 1 + count) % count];
    const p1 = points[i];
    const p2 = points[(i + 1) % count];
    const p3 = points[(i + 2) % count];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n(c1[0])},${n(c1[1])} ${n(c2[0])},${n(c2[1])} ${n(p2[0])},${n(p2[1])}`;
  }
  return `${d}Z`;
}

function svgDoc(width, height, body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs>${body}</svg>`;
}

async function save(name, svg) {
  const file = path.join(ART, name);
  await sharp(Buffer.from(svg), { unlimited: true }).png({ compressionLevel: 9 }).toFile(file);
  const { size } = fs.statSync(file);
  console.log(`${name.padEnd(28)} ${(size / 1024).toFixed(0).padStart(6)} KB`);
}

// Multiplies the graphic by soft noise so flat fills read as wax, cloth or paper.
function textureFilter(id, frequency, strength, seed) {
  return `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="3" seed="${seed}"/>
    <feColorMatrix type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="noise"/>
    <feComposite in="SourceGraphic" in2="noise" operator="arithmetic" k1="${strength}" k2="${1 - strength / 2}" k3="0" k4="0"/>
  </filter>`;
}

function blurFilter(id, deviation) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${deviation}"/></filter>`;
}

// --- Wax palettes ----------------------------------------------------------------

const WAX = {
  nawab: { light: '#6fdc98', mid: '#2a9a58', base: '#1b7d45', dark: '#0b4426', deep: '#06301a' },
  eic: { light: '#ec7280', mid: '#b52738', base: '#9c1a2b', dark: '#5c0b16', deep: '#3e0710' },
  observer: { light: '#e3cf9c', mid: '#a88a52', base: '#8a6f3f', dark: '#4d3c1f', deep: '#33270f' },
};

// --- Emblems (unit size: drawn to fit a circle of radius 1) --------------------
// Each returns { raised, engraved }: raised shapes are stamped up out of the wax
// (drawn with currentColor so the emboss pass can recolour them); engraved lines
// are cut in.

// War elephant in profile, facing right, with a Mughal caparison.
const ELEPHANT_BODY =
  'M-55,-45 C-58,-70 -35,-85 -5,-85 C20,-85 32,-80 38,-72 C44,-84 60,-86 66,-74 ' +
  'C72,-62 70,-48 66,-40 C62,-28 64,-12 72,-4 C75,-1 72,2 68,0 C58,-8 56,-24 56,-34 ' +
  'L50,-36 L48,0 L34,0 L33,-30 C15,-26 -15,-26 -30,-30 L-32,0 L-46,0 L-48,-34 ' +
  'C-54,-38 -55,-42 -55,-45 Z';
const ELEPHANT_FAR_LEGS = 'M24,-28 L26,0 L37,0 L36,-28 Z M-40,-30 L-38,0 L-28,0 L-27,-30 Z';
const ELEPHANT_EAR = 'M38,-72 C28,-70 24,-50 33,-42 C40,-40 45,-50 45,-62';
const ELEPHANT_TUSK = 'M55,-36 C60,-28 70,-27 78,-33';
const ELEPHANT_TAIL = 'M-55,-45 C-62,-40 -63,-30 -60,-20';
const ELEPHANT_CLOTH = 'M-34,-82 L24,-82 L22,-50 C4,-46 -14,-46 -32,-50 Z';

function elephantEmblem() {
  // Body spans x -63..78, y -86..2: centre it and scale to the unit circle.
  const t = 'translate(-0.05,0.3) scale(0.0124)';
  const raised = `<g transform="${t}">
    <path d="${ELEPHANT_FAR_LEGS}" fill="currentColor"/>
    <path d="${ELEPHANT_BODY}" fill="currentColor"/>
    <path d="${ELEPHANT_TAIL}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <path d="${ELEPHANT_TUSK}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <path d="M-62,4 L80,4" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
  </g>`;
  const engraved = `<g transform="${t}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <path d="${ELEPHANT_EAR}" stroke-width="3"/>
    <path d="${ELEPHANT_CLOTH}" stroke-width="2.6"/>
    <path d="M-30,-56 C-12,-52 6,-52 20,-56" stroke-width="2"/>
    <path d="M-20,-82 L-20,-50 M-6,-82 L-6,-48 M8,-82 L8,-50" stroke-width="1.6" stroke-dasharray="3 4"/>
    <circle cx="58" cy="-60" r="2.4" fill="currentColor" stroke="none"/>
  </g>`;
  return { raised, engraved };
}

// Laurel wreath around two crossed spears.
function laurelEmblem() {
  const leaves = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const phi = ((100 + i * 17) * Math.PI) / 180;
      const x = side * -0.8 * Math.cos(phi);
      const y = 0.8 * Math.sin(phi);
      // Direction of travel along the branch, bottom to top.
      const dx = side * Math.sin(phi);
      const dy = Math.cos(phi);
      const along = (Math.atan2(dy, dx) * 180) / Math.PI;
      for (const offset of [-38, 38]) {
        const a = ((along + offset) * Math.PI) / 180;
        const cx = x + Math.cos(a) * 0.09;
        const cy = y + Math.sin(a) * 0.09;
        leaves.push(
          `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="0.105" ry="0.04" transform="rotate(${n(along + offset)} ${n(cx)} ${n(cy)})" fill="currentColor"/>`,
        );
      }
    }
  }
  const stems = `<path d="M-0.14,0.79 A0.8,0.8 0 0 1 -0.69,-0.4 M0.14,0.79 A0.8,0.8 0 0 0 0.69,-0.4" fill="none" stroke="currentColor" stroke-width="0.035"/>`;
  const spear = (angle) => `<g transform="rotate(${angle})">
    <path d="M0,0.66 L0,-0.46" stroke="currentColor" stroke-width="0.05"/>
    <path d="M0,-0.74 C0.08,-0.62 0.08,-0.53 0,-0.47 C-0.08,-0.53 -0.08,-0.62 0,-0.74 Z" fill="currentColor"/>
    <path d="M-0.08,-0.45 L0.08,-0.45" stroke="currentColor" stroke-width="0.04"/>
    <path d="M-0.03,0.62 L0.03,0.62 L0.02,0.72 L-0.02,0.72 Z" fill="currentColor"/>
  </g>`;
  const ribbon = `<path d="M0,0.8 C-0.08,0.72 -0.2,0.74 -0.24,0.84 C-0.14,0.86 -0.06,0.84 0,0.8 C0.06,0.84 0.14,0.86 0.24,0.84 C0.2,0.74 0.08,0.72 0,0.8 Z" fill="currentColor"/>`;
  return {
    raised: `<g>${stems}${leaves.join('')}${spear(-34)}${spear(34)}${ribbon}</g>`,
    engraved: '<circle r="0.06" fill="currentColor"/>',
  };
}

// An open eye with rays, for observers.
function eyeEmblem() {
  const rays = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 360;
    rays.push(`<path d="M0,-0.62 L0.035,-0.8 L-0.035,-0.8 Z" transform="rotate(${a})" fill="currentColor"/>`);
  }
  return {
    raised: `<g>${rays.join('')}
      <path d="M-0.62,0 Q0,-0.5 0.62,0 Q0,0.5 -0.62,0 Z" fill="currentColor"/></g>`,
    engraved: `<g><circle r="0.22" fill="none" stroke="currentColor" stroke-width="0.05"/><circle r="0.09" fill="currentColor"/></g>`,
  };
}

// --- Seal borders (unit radius; the band between 0.64 and 0.78) ----------------

function mughalBorder() {
  const parts = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * 360;
    // Cusped arch pointing outward.
    parts.push(`<path d="M-0.06,-0.645 L-0.06,-0.69 Q-0.06,-0.735 0,-0.765 Q0.06,-0.735 0.06,-0.69 L0.06,-0.645" transform="rotate(${a})" fill="none" stroke="currentColor" stroke-width="0.018"/>`);
    parts.push(`<circle cx="0" cy="-0.7" r="0.014" transform="rotate(${a})" fill="currentColor"/>`);
    parts.push(`<ellipse cx="0" cy="-0.715" rx="0.012" ry="0.035" transform="rotate(${a + 180 / count})" fill="currentColor"/>`);
  }
  parts.push('<circle r="0.63" fill="none" stroke="currentColor" stroke-width="0.02"/>');
  return parts.join('');
}

function europeanBorder() {
  const parts = ['<circle r="0.645" fill="none" stroke="currentColor" stroke-width="0.016"/>', '<circle r="0.775" fill="none" stroke="currentColor" stroke-width="0.016"/>'];
  for (let i = 0; i < 40; i++) {
    parts.push(`<circle cx="0" cy="-0.71" r="0.02" transform="rotate(${i * 9})" fill="currentColor"/>`);
  }
  return parts.join('');
}

function plainBorder() {
  const parts = ['<circle r="0.65" fill="none" stroke="currentColor" stroke-width="0.02"/>', '<circle r="0.77" fill="none" stroke="currentColor" stroke-width="0.012"/>'];
  for (let i = 0; i < 24; i++) {
    parts.push(`<path d="M0,-0.68 L0,-0.74" transform="rotate(${i * 15})" stroke="currentColor" stroke-width="0.02"/>`);
  }
  return parts.join('');
}

// --- Wax seal -------------------------------------------------------------------

function sealOutline(R, seed) {
  const random = rng(seed);
  const bumps = [...Array(6)].map(() => ({ a: random() * Math.PI * 2, amp: 0.025 + random() * 0.06, w: 0.12 + random() * 0.25 }));
  const points = [];
  const count = 96;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    let k = 1 + 0.018 * Math.sin(3 * a + seed) + 0.012 * Math.sin(8 * a + seed * 2) + (random() - 0.5) * 0.018;
    for (const bump of bumps) {
      const d = Math.atan2(Math.sin(a - bump.a), Math.cos(a - bump.a));
      k += bump.amp * Math.exp(-(d * d) / (2 * bump.w * bump.w));
    }
    points.push([R * k * Math.cos(a), R * k * Math.sin(a)]);
  }
  return smoothClosed(points);
}

// Returns { defs, body } for a wax seal of radius R centred on (0, 0).
function waxSeal({ R, wax, emblem, border, seed, shadow = true, emblemScale = 0.56 }) {
  const ids = { body: uid('waxBody'), press: uid('waxPress'), tex: uid('waxTex'), soft: uid('soft'), clip: uid('clip'), gloss: uid('gloss') };
  const outline = sealOutline(R, seed);
  const k = R * 0.012; // emboss offset
  const raisedStamp = (markup) => `
    <g color="${wax.deep}" opacity="0.75" transform="translate(${n(k)},${n(k)})">${markup}</g>
    <g color="${wax.light}" opacity="0.55" transform="translate(${n(-k)},${n(-k)})">${markup}</g>
    <g color="${wax.mid}">${markup}</g>`;
  const unit = (markup, scale = R) => `<g transform="scale(${n(scale)})">${markup}</g>`;

  const defs = `
    <radialGradient id="${ids.body}" cx="0.36" cy="0.32" r="0.8">
      <stop offset="0" stop-color="${wax.light}"/>
      <stop offset="0.35" stop-color="${wax.mid}"/>
      <stop offset="0.75" stop-color="${wax.base}"/>
      <stop offset="1" stop-color="${wax.dark}"/>
    </radialGradient>
    <radialGradient id="${ids.press}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.8" stop-color="${wax.base}"/>
      <stop offset="1" stop-color="${wax.dark}"/>
    </radialGradient>
    <radialGradient id="${ids.gloss}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    ${textureFilter(ids.tex, n(2.4 / R), 0.35, seed)}
    ${blurFilter(ids.soft, n(R * 0.035))}
    <clipPath id="${ids.clip}"><path d="${outline}"/></clipPath>`;

  const em = emblem();
  const body = `
    ${shadow ? `<path d="${outline}" transform="translate(${n(R * 0.03)},${n(R * 0.06)})" fill="#000" opacity="0.5" filter="url(#${ids.soft})"/>` : ''}
    <g filter="url(#${ids.tex})">
      <path d="${outline}" fill="url(#${ids.body})"/>
      <g clip-path="url(#${ids.clip})">
        <!-- the pressed-in impression: dark lip top-left, lit lip bottom-right -->
        <circle r="${n(R * 0.8)}" fill="url(#${ids.press})"/>
        <circle r="${n(R * 0.8)}" fill="none" stroke="${wax.deep}" stroke-width="${n(R * 0.035)}" opacity="0.7" transform="translate(${n(-R * 0.012)},${n(-R * 0.012)})"/>
        <circle r="${n(R * 0.8)}" fill="none" stroke="${wax.light}" stroke-width="${n(R * 0.02)}" opacity="0.45" transform="translate(${n(R * 0.014)},${n(R * 0.014)})"/>
        ${raisedStamp(unit(border()))}
        ${raisedStamp(unit(em.raised, R * emblemScale))}
        <g color="${wax.deep}" opacity="0.85">${unit(em.engraved, R * emblemScale)}</g>
        <ellipse cx="${n(-R * 0.38)}" cy="${n(-R * 0.5)}" rx="${n(R * 0.42)}" ry="${n(R * 0.16)}" transform="rotate(-35 ${n(-R * 0.38)} ${n(-R * 0.5)})" fill="url(#${ids.gloss})" opacity="0.55"/>
        <circle cx="${n(-R * 0.55)}" cy="${n(-R * 0.62)}" r="${n(R * 0.035)}" fill="#fff" opacity="0.5"/>
      </g>
    </g>`;
  return { defs, body };
}

// --- Standalone pieces ------------------------------------------------------------

async function drawSeal(name, wax, emblem, border, seed) {
  const size = 1024;
  const seal = waxSeal({ R: 430, wax, emblem, border, seed });
  await save(name, svgDoc(size, size, `<g transform="translate(${size / 2 - 10},${size / 2 - 16})">${seal.body}</g>`, seal.defs));
}

async function drawBanner(name, { cloth, clothLight, clothDark, emblem, border, seed }) {
  const W = 816;
  const H = 1224;
  const random = rng(seed);
  const ids = { wood: uid('wood'), folds: uid('folds'), tex: uid('tex'), clip: uid('clip'), soft: uid('soft'), shade: uid('shade') };

  // Cloth: hangs from the crossbar, swallowtail bottom with ragged tears.
  const top = 222;
  const left = 118;
  const right = W - 118;
  const bottom = 1020;
  const edge = [];
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = lerp(right, left, t);
    // Swallowtail notch in the middle, plus tears.
    const notch = 150 * Math.max(0, 1 - Math.abs(t - 0.5) / 0.22);
    const tear = (random() - 0.3) * 46 + (i % 3 === 0 ? 30 : 0);
    edge.push(`L${n(x + (random() - 0.5) * 10)},${n(bottom - notch - tear)}`);
  }
  const clothPath = `M${left},${top} C${left + 160},${top + 34} ${right - 160},${top + 34} ${right},${top} L${right + 6},${bottom - 60} ${edge.join(' ')} L${left - 6},${bottom - 60} Z`;

  const foldStops = [...Array(13)]
    .map((_, i) => `<stop offset="${n(i / 12)}" stop-color="${i % 2 ? clothDark : clothLight}"/>`)
    .join('');

  const em = emblem();
  const paint = '#efe4c8';

  const defs = `
    <linearGradient id="${ids.wood}" x1="0" x2="1"><stop offset="0" stop-color="#3d2716"/><stop offset="0.45" stop-color="#7a5232"/><stop offset="1" stop-color="#2e1d10"/></linearGradient>
    <linearGradient id="${ids.folds}" x1="0" x2="1">${foldStops}</linearGradient>
    <linearGradient id="${ids.shade}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="0.25" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>
    ${textureFilter(ids.tex, 0.02, 0.5, seed)}
    ${blurFilter(ids.soft, 8)}
    <clipPath id="${ids.clip}"><path d="${clothPath}"/></clipPath>`;

  const lashing = (x) => `<path d="M${x - 16},188 L${x + 16},226 M${x + 16},188 L${x - 16},226" stroke="#2a1a0c" stroke-width="5"/>`;

  const body = `
    <path d="${clothPath}" fill="#000" opacity="0.35" transform="translate(10,16)" filter="url(#${ids.soft})"/>
    <rect x="${W / 2 - 17}" y="70" width="34" height="${H - 70}" fill="url(#${ids.wood})"/>
    <path d="M${W / 2},18 C${W / 2 + 22},52 ${W / 2 + 22},70 ${W / 2},88 C${W / 2 - 22},70 ${W / 2 - 22},52 ${W / 2},18 Z" fill="#8f8a7c"/>
    <rect x="70" y="192" width="${W - 140}" height="30" rx="8" fill="url(#${ids.wood})"/>
    <g filter="url(#${ids.tex})">
      <path d="${clothPath}" fill="${cloth}"/>
      <g clip-path="url(#${ids.clip})">
        <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${ids.folds})" opacity="0.55"/>
        <rect x="0" y="0" width="${W}" height="${H}" fill="url(#${ids.shade})"/>
        <g transform="translate(${W / 2},600) scale(250)" color="${paint}" opacity="0.8">
          <g>${border()}</g>
          <g transform="scale(0.56)">${em.raised}</g>
        </g>
        <g transform="translate(${W / 2},600) scale(140)" color="${cloth}" opacity="0.9">${em.engraved}</g>
      </g>
    </g>
    ${lashing(W / 2)}${lashing(150)}${lashing(W - 150)}`;
  await save(name, svgDoc(W, H, body, defs));
}

// --- Battlefield scene --------------------------------------------------------------
// Figures are drawn in unit space (about 100 units tall, feet at y=0, facing
// right) and placed with translate/scale. The Company side is mirrored.

function nawabSoldier(random, c) {
  const weapon = random();
  let arms;
  if (weapon < 0.45) {
    arms = `<path d="M3,-62 L19,-152" stroke="${c.dark}" stroke-width="2.4"/><path d="M19,-152 L14,-138 L22,-139 Z" fill="${c.dark}"/>`;
  } else if (weapon < 0.8) {
    arms = `<path d="M8,-50 L14,-122" stroke="${c.dark}" stroke-width="3"/><path d="M12,-62 L16,-70" stroke="${c.dark}" stroke-width="5"/>`;
  } else {
    arms = `<path d="M6,-74 C14,-92 20,-104 17,-120" stroke="${c.dark}" stroke-width="2.4" fill="none"/><circle cx="-10" cy="-64" r="8" fill="${c.dark}"/>`;
  }
  return `<circle cy="-86" r="6" fill="${c.dark}"/>
    <path d="M-8,-88 C-9,-98 -2,-102 2,-101 C8,-100 10,-94 8,-88 Z" fill="${c.cloth}"/>
    <path d="M-7,-80 L7,-80 L9,-56 L-9,-56 Z" fill="${c.cloth}"/>
    <path d="M-9,-57 L9,-57 L17,-25 C6,-22 -6,-22 -17,-25 Z" fill="${c.cloth}"/>
    <path d="M-6,-25 L-1,-25 L-2,0 L-8,0 Z M1,-25 L6,-25 L9,0 L3,0 Z" fill="${c.dark}"/>
    <path d="M6,-78 L10,-60" stroke="${c.dark}" stroke-width="4"/>
    ${arms}`;
}

function companySoldier(random, c, sepoy) {
  const leveled = random() < 0.35;
  const musket = leveled
    ? `<path d="M-4,-68 L34,-76" stroke="${c.dark}" stroke-width="2.6"/><path d="M34,-76 L48,-79" stroke="${c.steel}" stroke-width="1.2"/>`
    : `<path d="M4,-48 L-6,-128" stroke="${c.dark}" stroke-width="2.6"/><path d="M-6,-128 L-8,-143" stroke="${c.steel}" stroke-width="1.2"/>`;
  const hat = sepoy
    ? `<path d="M-7,-90 C-8,-99 -1,-102 2,-101 C7,-100 9,-95 7,-90 Z" fill="${c.light}"/>`
    : `<path d="M-12,-89 C-8,-93 -4,-100 0,-100 C4,-100 8,-93 12,-89 C4,-92 -4,-92 -12,-89 Z" fill="${c.dark}"/>`;
  return `<circle cy="-86" r="5.5" fill="${c.dark}"/>${hat}
    <path d="M-7,-81 L7,-81 L8,-52 L-8,-52 Z" fill="${c.coat}"/>
    <path d="M-8,-53 L8,-53 L10,-33 L2,-36 L-2,-36 L-10,-33 Z" fill="${c.coat}"/>
    <path d="M-7,-80 L7,-56 M7,-80 L-7,-56" stroke="${c.light}" stroke-width="1.4" opacity="0.6"/>
    <path d="M-6,-34 L-1,-34 L-2,0 L-7,0 Z M1,-34 L6,-34 L7,0 L2,0 Z" fill="${c.dark}"/>
    ${musket}`;
}

function warElephant(c) {
  return `<path d="${ELEPHANT_FAR_LEGS}" fill="${c.dark}"/>
    <path d="${ELEPHANT_BODY}" fill="${c.dark}"/>
    <path d="${ELEPHANT_TAIL}" stroke="${c.dark}" stroke-width="3" fill="none"/>
    <path d="${ELEPHANT_EAR}" stroke="${c.edge}" stroke-width="2" fill="none"/>
    <path d="${ELEPHANT_CLOTH}" fill="${c.banner}"/>
    <path d="M-32,-52 C-12,-47 6,-47 22,-52" stroke="${c.gold}" stroke-width="2.4" fill="none"/>
    <path d="${ELEPHANT_TUSK}" stroke="${c.ivory}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <circle cx="-5" cy="-106" r="4.5" fill="${c.dark}"/>
    <path d="M-10,-108 C-10,-115 0,-115 0,-108 Z" fill="${c.cloth}"/>
    <path d="M-28,-84 L18,-84 L18,-99 L-28,-99 Z" fill="${c.dark}"/>
    <path d="M-28,-99 L18,-99" stroke="${c.gold}" stroke-width="2"/>
    <path d="M-25,-99 L-25,-118 M15,-99 L15,-118" stroke="${c.dark}" stroke-width="2.4"/>
    <path d="M-31,-117 Q-5,-142 21,-117 Z" fill="${c.gold}" opacity="0.8"/>
    <path d="M-5,-136 L-5,-145" stroke="${c.gold}" stroke-width="2"/>
    <circle cx="42" cy="-92" r="4.5" fill="${c.dark}"/><path d="M36,-88 L46,-88 L46,-78 L36,-78 Z" fill="${c.dark}"/>`;
}

function cannon(c, tarp) {
  const spokes = [...Array(6)].map((_, i) => `<path d="M0,-14 L0,-28" transform="rotate(${i * 60} 0 -14)" stroke="${c.dark}" stroke-width="2"/>`).join('');
  const gun = `<path d="M0,-12 L-38,0" stroke="${c.dark}" stroke-width="6"/>
    <path d="M-6,-21 L42,-27 L42,-18 L-6,-12 Z" fill="${c.metal}"/>
    <circle cy="-14" r="14" fill="none" stroke="${c.dark}" stroke-width="3.5"/>${spokes}`;
  return tarp ? `${gun}<path d="M-34,0 L-14,-36 L34,-34 L52,0 Z" fill="${c.tarp}"/><path d="M-14,-36 L-24,0 M34,-34 L40,0" stroke="${c.dark}" stroke-width="1.4" opacity="0.6"/>` : gun;
}

function bannerPole(color, c, random) {
  const flutter = 6 + random() * 10;
  return `<path d="M0,0 L0,-172" stroke="${c.dark}" stroke-width="2.6"/>
    <path d="M0,-170 C14,-${165 + flutter / 2} 30,-${168 - flutter} 50,-158 C36,-154 20,-150 0,-138 Z" fill="${color}"/>`;
}

function mangoTree(random, color) {
  const blobs = [];
  for (let i = 0; i < 9; i++) {
    blobs.push(`<circle cx="${n((random() - 0.5) * 70)}" cy="${n(-60 - random() * 40)}" r="${n(18 + random() * 16)}"/>`);
  }
  return `<g fill="${color}"><path d="M-4,0 L-3,-50 L3,-50 L4,0 Z"/>${blobs.join('')}</g>`;
}

function lightningPath(random, x0, y0, y1, drift) {
  const points = [[x0, y0]];
  const steps = 34;
  let x = x0;
  for (let i = 1; i <= steps; i++) {
    const y = lerp(y0, y1, i / steps);
    x += (random() - 0.5) * 46 + drift;
    points.push([x, y]);
  }
  const branches = [];
  for (let b = 0; b < 4; b++) {
    const start = points[4 + Math.floor(random() * 22)];
    let bx = start[0];
    let by = start[1];
    const dir = random() < 0.5 ? -1 : 1;
    const segment = [`M${n(bx)},${n(by)}`];
    const length = 6 + Math.floor(random() * 8);
    for (let i = 0; i < length; i++) {
      bx += dir * (8 + random() * 22);
      by += 10 + random() * 22;
      segment.push(`L${n(bx)},${n(by)}`);
    }
    branches.push(segment.join(' '));
  }
  return { main: `M${points.map(([px, py]) => `${n(px)},${n(py)}`).join(' L')}`, branches };
}

function scene({ W, H, horizon, split, flagCenter, flagScale, figureScale, seed, lightning }) {
  const random = rng(seed);
  const ids = {
    sky: uid('sky'), cloudsDark: uid('cd'), cloudsLit: uid('cl'), cloudMask: uid('cm'), cloudMaskGrad: uid('cmg'),
    litMask: uid('lm'), litGrad: uid('lg'), glow: uid('glow'), ground: uid('ground'), flash: uid('flash'),
    smoke: uid('smoke'), boltGlow: uid('bg'), rim: uid('rim'), bottom: uid('bottom'), vignette: uid('vig'),
    river: uid('river'), seal1: uid('sg'), seal2: uid('sg'), pole: uid('pole'), clothTex: uid('ct'),
  };
  const defs = [];
  const layers = [];

  // Sky and storm clouds.
  defs.push(`
    <linearGradient id="${ids.sky}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a1018"/>
      <stop offset="${n((horizon / H) * 0.5)}" stop-color="#1a2532"/>
      <stop offset="${n((horizon / H) * 0.82)}" stop-color="#3a4250"/>
      <stop offset="${n((horizon / H) * 0.95)}" stop-color="#8a5a3c"/>
      <stop offset="${n(horizon / H)}" stop-color="#c8783e"/>
      <stop offset="1" stop-color="#2a1a10"/>
    </linearGradient>
    <filter id="${ids.cloudsDark}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${(3 / W).toFixed(5)} ${(5.5 / W).toFixed(5)}" numOctaves="5" seed="${seed}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.04  0 0 0 0 0.06  0 0 0 0 0.09  2.6 0 0 0 -1.05"/>
    </filter>
    <filter id="${ids.cloudsLit}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${(4 / W).toFixed(5)} ${(7 / W).toFixed(5)}" numOctaves="5" seed="${seed + 7}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.5  0 0 0 0 0.6  2.4 0 0 0 -1.1"/>
    </filter>
    <linearGradient id="${ids.cloudMaskGrad}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff"/><stop offset="${n((horizon / H) * 0.7)}" stop-color="#fff" stop-opacity="0.8"/><stop offset="${n(horizon / H)}" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="${ids.cloudMask}"><rect width="${W}" height="${H}" fill="url(#${ids.cloudMaskGrad})"/></mask>
    <radialGradient id="${ids.litGrad}" cx="${n(split / W)}" cy="0.15" r="0.55">
      <stop offset="0" stop-color="#fff" stop-opacity="${lightning ? 1 : 0.45}"/><stop offset="1" stop-color="#fff" stop-opacity="0.1"/>
    </radialGradient>
    <mask id="${ids.litMask}"><rect width="${W}" height="${H}" fill="url(#${ids.litGrad})"/></mask>
    <radialGradient id="${ids.glow}" cx="${n(split / W)}" cy="${n(horizon / H)}" r="0.6" gradientTransform="translate(${n(split / W)} ${n(horizon / H)}) scale(1 0.35) translate(${n(-split / W)} ${n(-horizon / H)})">
      <stop offset="0" stop-color="#ffb066" stop-opacity="0.7"/><stop offset="0.5" stop-color="#d46a2c" stop-opacity="0.25"/><stop offset="1" stop-color="#d46a2c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${ids.flash}" cx="${n(split / W)}" cy="0.12" r="0.7">
      <stop offset="0" stop-color="#cfe0ff" stop-opacity="${lightning ? 0.45 : 0}"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/>
    </radialGradient>`);
  layers.push(`<rect width="${W}" height="${H}" fill="url(#${ids.sky})"/>`);
  layers.push(`<rect width="${W}" height="${horizon}" fill="url(#${ids.flash})"/>`);
  layers.push(`<g mask="url(#${ids.cloudMask})"><rect width="${W}" height="${horizon}" filter="url(#${ids.cloudsDark})"/></g>`);
  layers.push(`<g mask="url(#${ids.litMask})" opacity="0.8"><g mask="url(#${ids.cloudMask})"><rect width="${W}" height="${horizon}" filter="url(#${ids.cloudsLit})"/></g></g>`);

  // Lightning down the middle, between the two armies.
  defs.push(blurFilter(ids.boltGlow, n(W * 0.006)));
  if (lightning) {
    const bolt = lightningPath(random, split + W * 0.02, 0, horizon - H * 0.02, -0.4);
    const all = [bolt.main, ...bolt.branches];
    layers.push(`<g fill="none" stroke-linejoin="round" stroke-linecap="round">
      <g filter="url(#${ids.boltGlow})" stroke="#8fb8ff" opacity="0.9">${all.map((d, i) => `<path d="${d}" stroke-width="${i ? n(W * 0.006) : n(W * 0.012)}"/>`).join('')}</g>
      ${all.map((d, i) => `<path d="${d}" stroke="#f4f8ff" stroke-width="${i ? n(W * 0.0012) : n(W * 0.0028)}"/>`).join('')}
    </g>`);
  }

  // Horizon: dusk glow, river, mango groves.
  layers.push(`<rect y="${n(horizon - H * 0.2)}" width="${W}" height="${n(H * 0.4)}" fill="url(#${ids.glow})"/>`);
  defs.push(`<linearGradient id="${ids.river}" x1="0" x2="1"><stop offset="0" stop-color="#9aa6b4" stop-opacity="0.5"/><stop offset="1" stop-color="#9aa6b4" stop-opacity="0"/></linearGradient>`);
  layers.push(`<path d="M0,${n(horizon + H * 0.004)} C${n(W * 0.2)},${n(horizon + H * 0.002)} ${n(W * 0.35)},${n(horizon + H * 0.012)} ${n(split - W * 0.04)},${n(horizon + H * 0.01)} L${n(split - W * 0.04)},${n(horizon + H * 0.016)} C${n(W * 0.3)},${n(horizon + H * 0.03)} ${n(W * 0.12)},${n(horizon + H * 0.028)} 0,${n(horizon + H * 0.03)} Z" fill="url(#${ids.river})"/>`);
  const groves = [];
  for (let x = -20; x < W + 40; x += 18 + random() * 40) {
    if (Math.abs(x - split) < W * 0.1) continue;
    const s = (0.25 + random() * 0.35) * figureScale;
    groves.push(`<g transform="translate(${n(x)},${n(horizon + H * 0.006)}) scale(${n(s)})">${mangoTree(random, '#151b23')}</g>`);
  }
  layers.push(`<g opacity="0.95">${groves.join('')}</g>`);

  // Ground.
  defs.push(`<linearGradient id="${ids.ground}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2e24"/><stop offset="0.25" stop-color="#1c1712"/><stop offset="1" stop-color="#070605"/></linearGradient>`);
  layers.push(`<rect y="${n(horizon + H * 0.012)}" width="${W}" height="${n(H - horizon)}" fill="url(#${ids.ground})"/>`);
  layers.push(`<rect y="${n(horizon + H * 0.012)}" width="${W}" height="${n(H * 0.08)}" fill="url(#${ids.glow})" opacity="0.6"/>`);

  // Armies, far rows first. Rim light comes from the glow behind them.
  defs.push(`<filter id="${ids.rim}" x="-10%" y="-10%" width="120%" height="120%">
    <feOffset in="SourceAlpha" dx="${n(-W * 0.0012)}" dy="${n(-W * 0.0008)}" result="o"/>
    <feFlood flood-color="#f0a060" flood-opacity="0.75"/><feComposite in2="o" operator="in" result="r"/>
    <feMerge><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(blurFilter(ids.smoke, n(W * 0.02)));

  const rows = [0.08, 0.24, 0.42, 0.62, 0.84];
  const groundDepth = H * 0.86 - horizon;
  const smokeBetween = (depth) => {
    const y = horizon + groundDepth * Math.pow(depth, 1.25);
    const puffs = [];
    for (let i = 0; i < 6; i++) {
      const x = split + (random() - 0.5) * W * 0.35;
      puffs.push(`<ellipse cx="${n(x)}" cy="${n(y - H * 0.02 - random() * H * 0.04)}" rx="${n(W * (0.08 + random() * 0.1))}" ry="${n(H * (0.02 + random() * 0.02))}" fill="${random() < 0.5 ? '#5a5650' : '#3a3836'}"/>`);
    }
    return `<g filter="url(#${ids.smoke})" opacity="0.55">${puffs.join('')}</g>`;
  };

  for (const depth of rows) {
    const y = horizon + groundDepth * Math.pow(depth, 1.25);
    const s = lerp(0.2, 1.1, depth) * figureScale;
    const haze = 1 - depth;
    const hazeColor = '#4a4f58';
    const near = {
      dark: mixColor('08090b', hazeColor.slice(1), haze * 0.85),
      cloth: mixColor('1f1e19', hazeColor.slice(1), haze * 0.85),
      coat: mixColor('6a121c', hazeColor.slice(1), haze * 0.75),
      light: mixColor('b8b2a2', hazeColor.slice(1), haze * 0.7),
      steel: mixColor('9aa0a8', hazeColor.slice(1), haze * 0.6),
      banner: mixColor('1c6e3f', hazeColor.slice(1), haze * 0.7),
      red: mixColor('a01c2c', hazeColor.slice(1), haze * 0.7),
      gold: mixColor('b08a3c', hazeColor.slice(1), haze * 0.7),
      ivory: mixColor('e8dcc0', hazeColor.slice(1), haze * 0.6),
      edge: mixColor('2a2a2a', hazeColor.slice(1), haze * 0.8),
      metal: mixColor('1a1a1c', hazeColor.slice(1), haze * 0.8),
      tarp: mixColor('4e4632', hazeColor.slice(1), haze * 0.8),
    };
    const row = [];
    const gap = W * 0.035 * Math.max(s / figureScale, 0.35);

    // Nawab's army, left of the lightning, facing right.
    let hasElephant = 0;
    for (let x = -gap; x < split - W * 0.05; x += gap * (0.6 + random() * 0.7)) {
      const jitterY = (random() - 0.5) * H * 0.008 * (1 + depth);
      const pick = random();
      const t = (scale) => `translate(${n(x)},${n(y + jitterY)}) scale(${n(scale)},${n(scale)})`;
      if (pick < 0.09 && depth > 0.15 && depth < 0.9 && hasElephant < 2) {
        hasElephant++;
        row.push(`<g transform="${t(s * 1.9)}">${warElephant(near)}</g>`);
        x += gap * 3.2;
      } else if (pick < 0.16) {
        row.push(`<g transform="${t(s)}">${bannerPole(near.banner, near, random)}</g>`);
      } else if (pick < 0.2 && depth > 0.3 && depth < 0.7) {
        row.push(`<g transform="${t(s)}">${cannon(near, true)}</g>`);
        x += gap;
      } else {
        row.push(`<g transform="${t(s * (0.92 + random() * 0.14))}">${nawabSoldier(random, near)}</g>`);
      }
    }

    // East India Company line, right of the lightning, facing left.
    for (let x = split + W * 0.05; x < W + gap; x += gap * (0.75 + random() * 0.3)) {
      const jitterY = (random() - 0.5) * H * 0.005 * (1 + depth);
      const pick = random();
      const t = (scale) => `translate(${n(x)},${n(y + jitterY)}) scale(${n(-scale)},${n(scale)})`;
      if (pick < 0.06) {
        row.push(`<g transform="${t(s)}">${bannerPole(near.red, near, random)}</g>`);
      } else if (pick < 0.11 && depth > 0.3 && depth < 0.7) {
        row.push(`<g transform="${t(s * 0.9)}">${cannon(near, false)}</g>`);
        x += gap;
      } else {
        row.push(`<g transform="${t(s * (0.95 + random() * 0.08))}">${companySoldier(random, near, random() < 0.4)}</g>`);
      }
    }

    layers.push(`<g ${depth > 0.3 ? `filter="url(#${ids.rim})"` : ''}>${row.join('')}</g>`);
    if (depth < 0.8) layers.push(smokeBetween(depth + 0.1));
  }

  // Crossed, torn battle flags with a glowing seal behind each.
  const [fx, fy] = flagCenter;
  const L = H * 0.32 * flagScale;
  const tilt = (27 * Math.PI) / 180;
  defs.push(`<linearGradient id="${ids.pole}" x1="0" x2="1"><stop offset="0" stop-color="#3a2614"/><stop offset="0.5" stop-color="#8a6038"/><stop offset="1" stop-color="#2a1a0c"/></linearGradient>`);
  defs.push(textureFilter(ids.clothTex, n(3 / L), 0.5, seed + 3));
  const sealGlow = (id, color) => `<radialGradient id="${id}"><stop offset="0.35" stop-color="${color}" stop-opacity="0.75"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
  defs.push(sealGlow(ids.seal1, '#38ff8c'), sealGlow(ids.seal2, '#ff3a52'));

  const flag = (side, color, light, dark, wax, emblem, border, glowId, flagSeed) => {
    const r = rng(flagSeed);
    const top = [fx - side * Math.sin(tilt) * L * 0.55, fy - Math.cos(tilt) * L * 0.55];
    const bottom = [fx + side * Math.sin(tilt) * L * 0.5, fy + Math.cos(tilt) * L * 0.5];
    const clothH = L * 0.36;
    const clothW = L * 0.62;
    const p0 = [top[0] + side * Math.sin(tilt) * L * 0.03, top[1] + Math.cos(tilt) * L * 0.03];
    const p3 = [p0[0] + side * Math.sin(tilt) * clothH, p0[1] + Math.cos(tilt) * clothH];
    const out = -side; // cloth flies away from the centre
    const wave = clothH * 0.18;
    const p1 = [p0[0] + out * clothW, p0[1] + wave * 0.6];
    const p2 = [p3[0] + out * clothW * 0.92, p3[1] + wave];
    // Ragged fly end from p1 down to p2.
    const tears = [];
    for (let i = 1; i < 10; i++) {
      const t = i / 10;
      const bx = lerp(p1[0], p2[0], t) + (i % 2 ? -out : out * 0.4) * (clothW * (0.06 + r() * 0.12));
      tears.push(`L${n(bx)},${n(lerp(p1[1], p2[1], t))}`);
    }
    const cloth = `M${n(p0[0])},${n(p0[1])} C${n(p0[0] + out * clothW * 0.35)},${n(p0[1] - wave)} ${n(p0[0] + out * clothW * 0.7)},${n(p0[1] + wave * 1.6)} ${n(p1[0])},${n(p1[1])} ${tears.join(' ')} L${n(p2[0])},${n(p2[1])} C${n(p3[0] + out * clothW * 0.6)},${n(p2[1] + wave * 0.8)} ${n(p3[0] + out * clothW * 0.3)},${n(p3[1] - wave * 0.6)} ${n(p3[0])},${n(p3[1])} Z`;
    const clipId = uid('flagClip');
    const foldId = uid('fold');
    const cx = lerp(p0[0], p2[0], 0.48);
    const cy = lerp(p0[1], p2[1], 0.5);
    const em = emblem();
    const seal = waxSeal({ R: L * 0.24, wax, emblem, border, seed: flagSeed, shadow: false });
    defs.push(seal.defs);
    defs.push(`<clipPath id="${clipId}"><path d="${cloth}"/></clipPath>`);
    defs.push(`<linearGradient id="${foldId}" x1="0" x2="1" gradientTransform="rotate(${side * 12})">${[...Array(9)].map((_, i) => `<stop offset="${n(i / 8)}" stop-color="${i % 2 ? dark : light}"/>`).join('')}</linearGradient>`);
    const sealX = cx + out * L * 0.12;
    const sealY = cy + L * 0.2;
    return {
      back: `<circle cx="${n(sealX)}" cy="${n(sealY)}" r="${n(L * 0.5)}" fill="url(#${glowId})"/>
        <g transform="translate(${n(sealX)},${n(sealY)})">${seal.body}</g>`,
      pole: `<path d="M${n(bottom[0])},${n(bottom[1])} L${n(top[0])},${n(top[1])}" stroke="#2a1a0c" stroke-width="${n(L * 0.03)}" stroke-linecap="round"/>
        <path d="M${n(bottom[0])},${n(bottom[1])} L${n(top[0])},${n(top[1])}" stroke="#8a6038" stroke-width="${n(L * 0.012)}" stroke-linecap="round" opacity="0.7"/>
        <circle cx="${n(top[0])}" cy="${n(top[1])}" r="${n(L * 0.022)}" fill="#a88a52"/>`,
      cloth: `<g filter="url(#${ids.clothTex})">
          <path d="${cloth}" fill="${color}"/>
          <g clip-path="url(#${clipId})">
            <rect x="${n(Math.min(p0[0], p1[0]) - 20)}" y="${n(p0[1] - 40)}" width="${n(clothW + 60)}" height="${n(clothH + 120)}" fill="url(#${foldId})" opacity="0.5"/>
            <g transform="translate(${n(cx)},${n(cy)}) scale(${n(clothH * 0.36)})" color="#efe4c8" opacity="0.7">${border()}<g transform="scale(0.56)">${em.raised}</g></g>
          </g>
        </g>`,
    };
  };

  const left = flag(1, '#1d7a45', '#2fa363', '#0f4a2a', WAX.nawab, elephantEmblem, mughalBorder, ids.seal1, seed + 11);
  const right = flag(-1, '#a51d2d', '#d0384a', '#5e0d18', WAX.eic, laurelEmblem, europeanBorder, ids.seal2, seed + 17);
  layers.push(left.back, right.back, left.pole, right.pole, left.cloth, right.cloth);

  // Rain.
  const rain = [];
  for (let i = 0; i < Math.round((W * H) / 2600); i++) {
    const x = random() * W * 1.1;
    const y = random() * H;
    const len = (14 + random() * 36) * (W / 1200);
    rain.push(`<path d="M${n(x)},${n(y)} l${n(-len * 0.22)},${n(len)}" stroke-width="${n(0.8 + random() * 1)}" opacity="${n(0.06 + random() * 0.16)}"/>`);
  }
  layers.push(`<g stroke="#b8c8da">${rain.join('')}</g>`);

  // Darker, quieter bottom band and a vignette.
  defs.push(`<linearGradient id="${ids.bottom}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#030303" stop-opacity="0"/><stop offset="${n((H * 0.74) / H)}" stop-color="#030303" stop-opacity="0"/><stop offset="0.9" stop-color="#030303" stop-opacity="0.82"/><stop offset="1" stop-color="#030303" stop-opacity="0.96"/></linearGradient>
    <radialGradient id="${ids.vignette}" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.7"/></radialGradient>`);
  layers.push(`<rect width="${W}" height="${H}" fill="url(#${ids.bottom})"/>`);
  layers.push(`<rect width="${W}" height="${H}" fill="url(#${ids.vignette})"/>`);

  return svgDoc(W, H, layers.join('\n'), defs.join('\n'));
}

// --- Run ------------------------------------------------------------------------

async function run() {
  fs.mkdirSync(ART, { recursive: true });

  const redrawVector = process.argv.includes('--vector');

  const portrait = { W: 1200, H: 1800, horizon: 1800 * 0.6, split: 600, flagCenter: [600, 1800 * 0.27], flagScale: 1, figureScale: 1.55, seed: 1757 };
  if (!redrawVector) {
    console.log('Nothing to draw: banners, seals and key art are hand-supplied. Pass --vector to redraw the vector versions.');
    return;
  }
  await drawBanner('banner-nawab.png', { cloth: '#1d7a45', clothLight: '#2fa363', clothDark: '#0f4a2a', emblem: elephantEmblem, border: mughalBorder, seed: 31 });
  await drawBanner('banner-eic.png', { cloth: '#a51d2d', clothLight: '#d0384a', clothDark: '#5e0d18', emblem: laurelEmblem, border: europeanBorder, seed: 37 });
  await drawSeal('seal-nawab.png', WAX.nawab, elephantEmblem, mughalBorder, 3);
  await drawSeal('seal-eic.png', WAX.eic, laurelEmblem, europeanBorder, 8);
  await drawSeal('seal-observer.png', WAX.observer, eyeEmblem, plainBorder, 14);
  await save('key-art-portrait.png', scene({ ...portrait, lightning: true }));
  await save('key-art-portrait-calm.png', scene({ ...portrait, lightning: false }));

  // Wide: the left half stays calmer and darker for the title.
  await save('key-art-wide.png', scene({ W: 2400, H: 1260, horizon: 1260 * 0.62, split: 1560, flagCenter: [1830, 1260 * 0.34], flagScale: 1.25, figureScale: 1.9, seed: 1757, lightning: true }));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
