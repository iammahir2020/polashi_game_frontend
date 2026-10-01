import type { AppRoute } from './routes';
import {
  DEFAULT_IMAGE,
  SITE_BANGLA_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SAME_AS,
  SITE_TITLE,
  toAbsoluteUrl,
} from './seoConfig';
import type { JsonLdDocument } from './types';

export type RouteSeoEntry = {
  title: string;
  description: string;
  image?: string;
  robots?: string;
  jsonLd?: JsonLdDocument[];
};

export const NOINDEX_ROBOTS = 'noindex, nofollow';

// The physical board game this site adapts. Credited, not claimed.
const BASED_ON_GAME: JsonLdDocument = {
  '@type': 'Game',
  name: 'Polashi',
  publisher: {
    '@type': 'Organization',
    name: 'Playground Inc.',
  },
};

export const baseSchemas = (path: string): JsonLdDocument[] => [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_BANGLA_NAME,
    url: toAbsoluteUrl('/'),
    inLanguage: ['en', 'bn'],
    ...(SITE_SAME_AS.length > 0 ? { sameAs: SITE_SAME_AS } : {}),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: SITE_NAME,
    alternateName: SITE_BANGLA_NAME,
    description: SITE_DESCRIPTION,
    url: toAbsoluteUrl(path),
    image: toAbsoluteUrl(DEFAULT_IMAGE),
    genre: 'Social deduction',
    numberOfPlayers: {
      '@type': 'QuantitativeValue',
      minValue: 5,
      maxValue: 10,
    },
    gamePlatform: 'Web browser',
    inLanguage: ['en', 'bn'],
    applicationCategory: 'Game',
    playMode: 'MultiPlayer',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: toAbsoluteUrl('/'),
    },
    isBasedOn: BASED_ON_GAME,
    ...(SITE_SAME_AS.length > 0 ? { sameAs: SITE_SAME_AS } : {}),
  },
];

export const ROUTE_SEO: Record<AppRoute, RouteSeoEntry> = {
  '/': {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    image: DEFAULT_IMAGE,
    jsonLd: baseSchemas('/'),
  },
};

// Room invite links (/?room=CODE) are private session URLs: never index them.
export function isPrivateSessionUrl(search: string): boolean {
  return new URLSearchParams(search).has('room');
}

export function resolveRouteSeo(pathname: string, search = ''): RouteSeoEntry {
  const isPublicRoute = pathname in ROUTE_SEO;
  const entry = isPublicRoute ? ROUTE_SEO[pathname as AppRoute] : ROUTE_SEO['/'];

  // Only the public routes listed in routes.ts are indexable.
  if (!isPublicRoute || isPrivateSessionUrl(search)) {
    return { ...entry, robots: NOINDEX_ROBOTS };
  }

  return entry;
}
