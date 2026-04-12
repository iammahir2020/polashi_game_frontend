export type SitemapChangeFreq =
	| 'always'
	| 'hourly'
	| 'daily'
	| 'weekly'
	| 'monthly'
	| 'yearly'
	| 'never';

export type SitemapRoute = {
	path: `/${string}`;
	changefreq?: SitemapChangeFreq;
	priority?: number;
};

export const SITEMAP_ROUTES = [
	{
		path: '/',
		changefreq: 'weekly',
		priority: 1.0,
	},
] as const satisfies readonly SitemapRoute[];

export type AppRoute = (typeof SITEMAP_ROUTES)[number]['path'];
