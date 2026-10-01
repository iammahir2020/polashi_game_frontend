export const SITE_NAME = 'The Battle of Polashi';
export const SITE_ALT_NAME = 'Polashi (পলাশী)';
export const SITE_BANGLA_NAME = 'পলাশী';
export const SITE_TITLE = 'The Battle of Polashi (পলাশী) – Online Social Deduction Game';
export const SITE_DESCRIPTION =
  "Play Polashi (পলাশী) online with 5–10 friends. Hidden roles, Nawab vs East India Company. Unofficial adaptation of Playground Inc.'s Polashi board game.";
export const DEFAULT_IMAGE = '/og-image.jpg';
export const DEFAULT_IMAGE_WIDTH = 1200;
export const DEFAULT_IMAGE_HEIGHT = 630;
export const DEFAULT_IMAGE_ALT =
  'The Battle of Polashi (পলাশী): Nawab and East India Company armies on a stormy battlefield';
export const SITE_LOCALE = 'en_US';
export const SITE_LOCALE_ALTERNATE = 'bn_BD';

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://the-great-polashi-game.vercel.app'
).replace(/\/$/, '');

export const SITE_SAME_AS = (import.meta.env.VITE_SITE_SAME_AS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export function toAbsoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function toAbsoluteImage(imagePath = DEFAULT_IMAGE) {
  return imagePath.startsWith('http')
    ? imagePath
    : `${SITE_URL}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
}
