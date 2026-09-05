/**
 * Runs once before EVERY test file in this suite (wired via `test.setupFiles`
 * in vite.config.ts) — this is where you put things every test needs, so
 * individual test files don't have to repeat them.
 *
 * `@testing-library/jest-dom/vitest` adds DOM-flavoured matchers to `expect`:
 * `toBeInTheDocument()`, `toBeDisabled()`, `toHaveAttribute()`, and friends.
 * Without it you'd fall back to `expect(el).not.toBeNull()`, which passes for
 * the wrong reasons — an element can exist in memory and still be invisible,
 * disconnected, or `display: none`. Import path matters: the `/vitest` variant
 * (not the plain `@testing-library/jest-dom`) registers matchers Vitest's
 * `expect` recognizes; the plain import targets Jest's expect instead.
 */
import '@testing-library/jest-dom/vitest';

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * React Testing Library renders each component into a real DOM node appended
 * to `document.body`. Without cleanup, the DOM from test 1 is still sitting
 * there when test 2 renders — `getByRole('button')` can then match two
 * buttons from two different tests and fail with a confusing "found multiple
 * elements" error that has nothing to do with either test's actual logic.
 * `afterEach` runs this after every single `it`, in every file, automatically.
 */
afterEach(() => {
  cleanup();
});
