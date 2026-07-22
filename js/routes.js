import { games } from './data.js';

export const workPath = slug => '/work/' + encodeURIComponent(slug);

export function gameBySlug(slug) {
  return games.find(g => g.slug === slug) || null;
}

/** Resolve a shared work URL from the pathname or hash. */
export function resolveWorkRoute(loc = location) {
  const pathMatch = loc.pathname.match(/^\/work\/([^/]+)\/?$/);
  if (pathMatch) return gameBySlug(decodeURIComponent(pathMatch[1]));

  const hash = loc.hash.slice(1);
  if (!hash) return null;
  if (hash.startsWith('work-')) return games.find(g => g.index === hash.slice(5)) || null;
  return gameBySlug(hash);
}
