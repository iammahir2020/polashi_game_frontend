import { useEffect } from 'react';
import { DEFAULT_IMAGE, toAbsoluteImage, toAbsoluteUrl } from './seoConfig';
import type { JsonLdDocument } from './types';

type SeoHeadProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  robots?: string;
  jsonLd?: JsonLdDocument | JsonLdDocument[];
};

function upsertMeta(
  selector: string,
  attrName: 'name' | 'property',
  attrValue: string,
  content: string,
) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }

  tag.setAttribute('href', href);
}

function replaceJsonLd(jsonLdDocs: JsonLdDocument[]) {
  document
    .head
    .querySelectorAll<HTMLScriptElement>('script[data-seo-jsonld="true"]')
    .forEach((tag) => tag.remove());

  jsonLdDocs.forEach((jsonLd) => {
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.setAttribute('data-seo-jsonld', 'true');
    tag.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(tag);
  });
}

export default function SeoHead({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  robots = 'index, follow, max-image-preview:large',
  jsonLd,
}: SeoHeadProps) {
  useEffect(() => {
    const canonicalUrl = toAbsoluteUrl(path);
    const imageUrl = toAbsoluteImage(image);

    document.title = title;

    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', robots);
    upsertLink('canonical', canonicalUrl);

    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);

    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    if (jsonLd) {
      const jsonLdDocs = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      replaceJsonLd(jsonLdDocs);
    } else {
      replaceJsonLd([]);
    }
  }, [title, description, path, image, robots, jsonLd]);

  return null;
}
