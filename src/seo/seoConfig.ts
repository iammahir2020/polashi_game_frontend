export const SITE_NAME = 'The Battle of Polashi';
export const SITE_ALT_NAME = 'Polashi (পলাশী)';
export const SITE_DESCRIPTION =
  'The Battle of Polashi is a social strategy web game inspired by historical intrigue, alliances, and deception.';
export const DEFAULT_IMAGE = '/polashi_fav_high_res.png';

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
