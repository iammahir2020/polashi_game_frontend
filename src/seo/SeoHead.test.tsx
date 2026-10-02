import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import SeoHead from './SeoHead';
import {
  DEFAULT_IMAGE_ALT,
  SITE_DESCRIPTION,
  SITE_TITLE,
  toAbsoluteImage,
} from './seoConfig';

const meta = (selector: string) =>
  document.head.querySelector<HTMLMetaElement>(`meta[${selector}]`)?.content;

describe('SeoHead', () => {
  it('writes title, description and the share image tags', () => {
    render(<SeoHead title={SITE_TITLE} description={SITE_DESCRIPTION} />);

    expect(document.title).toBe(SITE_TITLE);
    expect(meta('name="description"')).toBe(SITE_DESCRIPTION);
    expect(meta('property="og:image"')).toBe(toAbsoluteImage('/og-image.jpg'));
    expect(meta('property="og:image:width"')).toBe('1200');
    expect(meta('property="og:image:height"')).toBe('630');
    expect(meta('property="og:image:alt"')).toBe(DEFAULT_IMAGE_ALT);
    expect(meta('name="twitter:image:alt"')).toBe(DEFAULT_IMAGE_ALT);
  });

  it('writes site name and locales', () => {
    render(<SeoHead title={SITE_TITLE} description={SITE_DESCRIPTION} />);

    expect(meta('property="og:site_name"')).toBe('The Battle of Polashi');
    expect(meta('property="og:locale"')).toBe('en_US');
    expect(meta('property="og:locale:alternate"')).toBe('bn_BD');
  });
});

// index.html carries the same tags statically for crawlers that do not run JS.
// These checks keep the two copies from drifting apart.
describe('index.html static tags', () => {
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const staticMeta = (selector: string) =>
    doc.querySelector<HTMLMetaElement>(`meta[${selector}]`)?.content;

  it('matches the title and description in seoConfig', () => {
    expect(doc.title).toBe(SITE_TITLE);
    expect(staticMeta('name="description"')).toBe(SITE_DESCRIPTION);
    expect(staticMeta('property="og:title"')).toBe(SITE_TITLE);
    expect(staticMeta('name="twitter:description"')).toBe(SITE_DESCRIPTION);
  });

  it('points the share image at og-image.jpg', () => {
    expect(staticMeta('property="og:image"')).toMatch(/\/og-image\.jpg$/);
    expect(staticMeta('property="og:image:alt"')).toBe(DEFAULT_IMAGE_ALT);
  });

  it('uses the generated favicon set', () => {
    const hrefs = [...doc.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')].map(
      (link) => link.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/favicon.ico', '/favicon-32.png', '/apple-touch-icon.png']);
  });
});
