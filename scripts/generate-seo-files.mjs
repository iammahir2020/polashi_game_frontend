import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const ROUTES_FILE = path.join(ROOT, 'src', 'seo', 'routes.ts');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const content = fs.readFileSync(filePath, 'utf-8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const delimiterIndex = line.indexOf('=');
    if (delimiterIndex <= 0) {
      continue;
    }

    const key = line.slice(0, delimiterIndex).trim();
    let value = line.slice(delimiterIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getSiteUrl() {
  const mergedFileEnv = {
    ...parseEnvFile(path.join(ROOT, '.env')),
    ...parseEnvFile(path.join(ROOT, '.env.local')),
    ...parseEnvFile(path.join(ROOT, '.env.production')),
    ...parseEnvFile(path.join(ROOT, '.env.production.local')),
  };

  const siteUrl = process.env.VITE_SITE_URL || mergedFileEnv.VITE_SITE_URL || 'https://the-great-polashi-game.vercel.app';

  return siteUrl.replace(/\/$/, '');
}

function getRoutes() {
  if (!fs.existsSync(ROUTES_FILE)) {
    return [{ path: '/', changefreq: 'weekly', priority: 1.0 }];
  }

  const routesSource = fs.readFileSync(ROUTES_FILE, 'utf-8');
  const arrayMatch = routesSource.match(/SITEMAP_ROUTES\s*=\s*\[([\s\S]*?)\]\s*as const/);

  if (!arrayMatch) {
    return [{ path: '/', changefreq: 'weekly', priority: 1.0 }];
  }

  const objectBlocks = arrayMatch[1].match(/\{[\s\S]*?\}/g) || [];

  const routes = objectBlocks
    .map((block) => {
      const pathMatch = block.match(/path\s*:\s*['"](\/[^'"]*)['"]/);
      if (!pathMatch) {
        return null;
      }

      const changefreqMatch = block.match(/changefreq\s*:\s*['"]([a-z]+)['"]/i);
      const priorityMatch = block.match(/priority\s*:\s*([0-9]*\.?[0-9]+)/);

      const priorityValue = priorityMatch ? Number(priorityMatch[1]) : undefined;

      return {
        path: pathMatch[1],
        changefreq: changefreqMatch ? changefreqMatch[1].toLowerCase() : undefined,
        priority: Number.isFinite(priorityValue) ? priorityValue : undefined,
      };
    })
    .filter(Boolean);

  return routes.length > 0 ? routes : [{ path: '/', changefreq: 'weekly', priority: 1.0 }];
}

function generateSitemap(siteUrl, routes) {
  const now = new Date().toISOString();
  const urls = routes
    .map((routeEntry) => {
      const routePath = routeEntry.path;
      const normalizedRoute = routePath === '/' ? '/' : routePath;
      const changefreq = routeEntry.changefreq || 'weekly';
      const fallbackPriority = routePath === '/' ? 1.0 : 0.8;
      const numericPriority =
        typeof routeEntry.priority === 'number' ? routeEntry.priority : fallbackPriority;
      const boundedPriority = Math.min(1, Math.max(0, numericPriority));
      const priority = boundedPriority.toFixed(1);

      return `  <url>\n    <loc>${siteUrl}${normalizedRoute}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function generateRobots(siteUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function run() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  const siteUrl = getSiteUrl();
  const routes = getRoutes();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), generateSitemap(siteUrl, routes), 'utf-8');
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), generateRobots(siteUrl), 'utf-8');

  console.log(`Generated robots.txt and sitemap.xml for ${siteUrl}`);
  console.log(`Indexed routes: ${routes.map((route) => route.path).join(', ')}`);
}

run();
