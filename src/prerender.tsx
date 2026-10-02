// Build-time entry used by scripts/prerender.mjs (never shipped to the browser).
// Returns the static markup and head metadata for each pre-rendered page.
import { renderToStaticMarkup } from 'react-dom/server';
import HowToPlay from './pages/HowToPlay';
import { resolveRouteSeo } from './seo/routeSeo';
import { toAbsoluteUrl } from './seo/seoConfig';

const PAGES = {
  '/how-to-play': HowToPlay,
} as const;

export type PrerenderedPage = {
  path: string;
  html: string;
  title: string;
  description: string;
  canonical: string;
  jsonLd: string[];
};

function seoFor(path: string) {
  const seo = resolveRouteSeo(path);
  return {
    title: seo.title,
    description: seo.description,
    canonical: toAbsoluteUrl(path),
    jsonLd: (seo.jsonLd ?? []).map((doc) => JSON.stringify(doc)),
  };
}

// The home page stays client-rendered; only its JSON-LD is made static.
export function homeHead() {
  return seoFor('/');
}

export function renderPages(): PrerenderedPage[] {
  return Object.entries(PAGES).map(([path, Page]) => ({
    path,
    html: renderToStaticMarkup(<Page />),
    ...seoFor(path),
  }));
}
