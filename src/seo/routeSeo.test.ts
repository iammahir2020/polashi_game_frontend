import { describe, expect, it } from 'vitest';
import { NOINDEX_ROBOTS, ROUTE_SEO, baseSchemas, resolveRouteSeo } from './routeSeo';
import { SITEMAP_ROUTES } from './routes';
import { SITE_DESCRIPTION, SITE_TITLE } from './seoConfig';

describe('resolveRouteSeo', () => {
  it('returns the home entry for /', () => {
    expect(resolveRouteSeo('/')).toBe(ROUTE_SEO['/']);
  });

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
