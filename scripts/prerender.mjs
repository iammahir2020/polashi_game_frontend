// Post-build step: writes static HTML for the public content pages so crawlers
// see real text without running JS, and adds the JSON-LD to dist/index.html.
//
// Loads src/prerender.tsx through Vite's SSR loader, so it uses the same code
// and the same VITE_* env as the client build. On load in the browser,
// createRoot() replaces the static markup with the live React tree.

import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

function escapeAttr(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function escapeText(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
}

function setMeta(html, attr, key, content) {
  const pattern = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
  if (!pattern.test(html)) throw new Error(`index.html is missing <meta ${attr}="${key}">`);
  return html.replace(pattern, `$1${escapeAttr(content)}$2`);
}

function jsonLdTags(docs) {
  // Same marker SeoHead uses, so the client replaces these instead of duplicating them.
  return docs
    .map((doc) => `<script type="application/ld+json" data-seo-jsonld="true">${doc.replaceAll('<', '\\u003c')}</script>`)
    .join('\n    ');
}

function withHead(template, page) {
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeText(page.title)}</title>`);
  html = setMeta(html, 'name', 'description', page.description);
  html = setMeta(html, 'property', 'og:title', page.title);
  html = setMeta(html, 'property', 'og:description', page.description);
  html = setMeta(html, 'property', 'og:url', page.canonical);
  html = setMeta(html, 'name', 'twitter:title', page.title);
  html = setMeta(html, 'name', 'twitter:description', page.description);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${escapeAttr(page.canonical)}$2`);
  return html.replace('</head>', `    ${jsonLdTags(page.jsonLd)}\n  </head>`);
}

async function run() {
  const templatePath = path.join(DIST, 'index.html');
  if (!fs.existsSync(templatePath)) throw new Error('dist/index.html not found; run vite build first');
  const template = fs.readFileSync(templatePath, 'utf-8');

  const vite = await createServer({
    configFile: false,
    root: ROOT,
    plugins: [react()],
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    // No browser bundle here, so skip the dependency pre-bundling scan.
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  try {
    const { renderPages, homeHead } = await vite.ssrLoadModule('/src/prerender.tsx');

    fs.writeFileSync(templatePath, withHead(template, homeHead()));
    console.log('prerender: added JSON-LD to dist/index.html');

    for (const page of renderPages()) {
      const html = withHead(template, page).replace(
        '<div id="root"></div>',
        `<div id="root">${page.html}</div>`,
      );
      const outDir = path.join(DIST, page.path.replace(/^\//, ''));
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'index.html'), html);
      console.log(`prerender: ${page.path} -> ${path.relative(ROOT, path.join(outDir, 'index.html'))}`);
    }
  } finally {
    await vite.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
