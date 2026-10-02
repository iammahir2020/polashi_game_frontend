/**
 * LEVEL 1 — EXERCISE 5 (all yours; no worked example in this file)
 *
 * `resolveRouteSeo` in ./routeSeo.ts is a four-line function, and it is the only
 * thing standing between a mistyped URL and a page with no <title>. Four lines is
 * exactly the size of thing people skip testing.
 *
 * Read it first. `ROUTE_SEO` started with ONE entry, '/'; '/how-to-play' has
 * since been added, which is exactly the day 5b below stopped being trivial.
 *
 * Since then the fallback also marks unknown paths `noindex` (only public pages
 * in routes.ts should be indexed), so it returns a noindex COPY of the root
 * entry rather than the root entry itself.
 */

import { describe, it, expect } from 'vitest';
import { baseSchemas, NOINDEX_ROBOTS, resolveRouteSeo, ROUTE_SEO } from './routeSeo';
import { SITEMAP_ROUTES } from './routes';
import { SITE_DESCRIPTION, SITE_TITLE } from './seoConfig';

// HINT: you'll want `resolveRouteSeo` and `ROUTE_SEO` from './routeSeo'.

describe('resolveRouteSeo', () => {
  // EXERCISE 5a
  // The rule: any path that isn't in ROUTE_SEO falls back to the '/' entry.
  //
  // A good table here is a handful of genuinely different *kinds* of unknown
  // path, not five spellings of the same one. Think about what a crawler or a
  // stray link actually throws at a site: a plausible-looking route, a deep
  // nested path, a trailing slash, an empty string, something with a query
  // string glued on. Each row should be able to fail for its own reason.

  const routes = ['/signup','/results','','/user/1/info','/playerinfo?user=1']
  
  // NOTE: this used to assert *identity* with `toBe(ROUTE_SEO['/'])`. The
  // fallback now returns a copy with `robots: noindex` added, so `toEqual` on
  // the expected shape is the right check, and `not.toBe` proves it really is
  // a copy and not the shared root object mutated in place.
  it.each(routes)(
    'falls back to the root entry for an unknown path, for route %s',
  (route)=>{
    const result = resolveRouteSeo(route)
    expect(result).toEqual({ ...ROUTE_SEO['/'], robots: NOINDEX_ROBOTS })
    expect(result).not.toBe(ROUTE_SEO['/'])
  });

  // EXERCISE 5b
  // The other half of the rule — the part people forget. 5a on its own would
  // still pass if the function ignored its argument and always returned the root
  // entry. Prove it actually looks the path up.
  //
  // HINT: with only one route defined, there is exactly one input that proves
  // this. That feels almost too small to be worth a test; write it anyway and
  // notice how it stops being trivial the day a second route appears.
  it.each(['/', '/how-to-play'] as const)('returns the matching entry for a known path, route %s', (route) => {
    const result = resolveRouteSeo(route)
    expect(result).toBe(ROUTE_SEO[route])
  });
});

describe('resolveRouteSeo indexing', () => {
  it('keeps every public route indexable', () => {
    for (const { path } of SITEMAP_ROUTES) {
      expect(resolveRouteSeo(path).robots).toBeUndefined();
    }
  });

  it('marks room invite links noindex', () => {
    expect(resolveRouteSeo('/', '?room=ABCD').robots).toBe(NOINDEX_ROBOTS);
  });

  it('marks unknown paths noindex', () => {
    expect(resolveRouteSeo('/not-a-page').robots).toBe(NOINDEX_ROBOTS);
  });

  it('ignores unrelated query strings', () => {
    expect(resolveRouteSeo('/', '?utm_source=share').robots).toBeUndefined();
  });
});

describe('copy', () => {
  it('keeps the title near 60 characters', () => {
    expect(SITE_TITLE.length).toBeLessThanOrEqual(65);
    expect(SITE_TITLE).toContain('পলাশী');
  });

  it('keeps the description near 150 characters and credits Playground Inc.', () => {
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(SITE_DESCRIPTION).toContain('5–10');
    expect(SITE_DESCRIPTION).toContain('Playground Inc.');
  });
});

describe('structured data', () => {
  const docs = baseSchemas('/');
  const byType = (type: string) => docs.find((doc) => doc['@type'] === type);

  it('emits a WebSite and a VideoGame, both with a schema.org context', () => {
    expect(docs.map((doc) => doc['@type'])).toEqual(['WebSite', 'VideoGame']);
    for (const doc of docs) {
      expect(doc['@context']).toBe('https://schema.org');
    }
  });

  it('survives a JSON round trip unchanged', () => {
    expect(JSON.parse(JSON.stringify(docs))).toEqual(docs);
  });

  it('describes the game', () => {
    expect(byType('VideoGame')).toMatchObject({
      name: 'The Battle of Polashi',
      alternateName: 'পলাশী',
      description: SITE_DESCRIPTION,
      url: expect.stringMatching(/^https?:\/\//),
      image: expect.stringMatching(/\/og-image\.jpg$/),
      genre: 'Social deduction',
      numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 5, maxValue: 10 },
      gamePlatform: 'Web browser',
      inLanguage: ['en', 'bn'],
      applicationCategory: 'Game',
      offers: { '@type': 'Offer', price: '0' },
    });
  });

  it('credits the board game it is based on', () => {
    expect(byType('VideoGame')?.isBasedOn).toEqual({
      '@type': 'Game',
      name: 'Polashi',
      publisher: { '@type': 'Organization', name: 'Playground Inc.' },
    });
  });
});
