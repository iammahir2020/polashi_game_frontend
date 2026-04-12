import type { AppRoute } from './routes';
import {
  DEFAULT_IMAGE,
  SITE_ALT_NAME,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SAME_AS,
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

const baseSchemas = (path: string): JsonLdDocument[] => [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_ALT_NAME,
    url: toAbsoluteUrl('/'),
    inLanguage: ['en', 'bn'],
    ...(SITE_SAME_AS.length > 0 ? { sameAs: SITE_SAME_AS } : {}),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: SITE_NAME,
    alternateName: SITE_ALT_NAME,
    url: toAbsoluteUrl(path),
    description: SITE_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: toAbsoluteUrl('/'),
    },
    genre: ['Social Deduction', 'Strategy'],
    image: toAbsoluteUrl(DEFAULT_IMAGE),
    applicationCategory: 'Game',
    keywords: ['Polashi', 'Palaashi', 'social deduction', 'strategy game'],
    gamePlatform: ['Web Browser'],
    playMode: 'MultiPlayer',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: toAbsoluteUrl(path),
    },
    potentialAction: {
      '@type': 'PlayAction',
      target: toAbsoluteUrl(path),
    },
    operatingSystem: 'Web',
    ...(SITE_SAME_AS.length > 0 ? { sameAs: SITE_SAME_AS } : {}),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: toAbsoluteUrl('/'),
    logo: toAbsoluteUrl(DEFAULT_IMAGE),
    ...(SITE_SAME_AS.length > 0 ? { sameAs: SITE_SAME_AS } : {}),
  },
];

export const ROUTE_SEO: Record<AppRoute, RouteSeoEntry> = {
  '/': {
    title: `${SITE_NAME} (${SITE_ALT_NAME})`,
    description: SITE_DESCRIPTION,
    image: DEFAULT_IMAGE,
    jsonLd: baseSchemas('/'),
  },
};

export function resolveRouteSeo(pathname: string): RouteSeoEntry {
  if (pathname in ROUTE_SEO) {
    return ROUTE_SEO[pathname as AppRoute];
  }

  return ROUTE_SEO['/'];
}
