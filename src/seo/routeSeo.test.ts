/**
 * LEVEL 1 — EXERCISE 5 (all yours; no worked example in this file)
 *
 * `resolveRouteSeo` in ./routeSeo.ts is a four-line function, and it is the only
 * thing standing between a mistyped URL and a page with no <title>. Four lines is
 * exactly the size of thing people skip testing.
 *
 * Read it first. Note that `ROUTE_SEO` currently has ONE entry, '/', so today
 * every path except '/' takes the fallback branch. That will stop being true the
 * moment a second route is added — which is precisely why the test is worth
 * having now.
 */

import { describe, it, expect } from 'vitest';
import { resolveRouteSeo, ROUTE_SEO } from './routeSeo';

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
  
  // HINT: the assertion is about *identity* — the fallback returns the very same
  // object, so `toBe(ROUTE_SEO['/'])` is right and `toEqual` would be a weaker
  // check that also passes for a lookalike copy. This is the one place in the
  // course so far where `toBe` on an object is what you want. (Re-read the
  // toBe/toEqual table in TESTING.md if that sentence didn't land.)
  it.each(routes)(
    'falls back to the root entry for an unknown path, for route %s',
  (route)=>{
    const result = resolveRouteSeo(route)
    expect(result).toBe(ROUTE_SEO['/'])
  });

  // EXERCISE 5b
  // The other half of the rule — the part people forget. 5a on its own would
  // still pass if the function ignored its argument and always returned the root
  // entry. Prove it actually looks the path up.
  //
  // HINT: with only one route defined, there is exactly one input that proves
  // this. That feels almost too small to be worth a test; write it anyway and
  // notice how it stops being trivial the day a second route appears.
  it('returns the matching entry for a known path, only route "/" ',()=>{
    const result = resolveRouteSeo('/')
    expect(result).toBe(ROUTE_SEO['/'])
  });
});
