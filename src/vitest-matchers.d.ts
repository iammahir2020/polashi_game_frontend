/**
 * Makes jest-dom's matchers (`toBeInTheDocument`, `toBeDisabled`, etc.) visible
 * to TypeScript wherever a component test lives under `src/`.
 *
 * The runtime side of this is `tests/setupTests.ts`, which imports
 * `@testing-library/jest-dom/vitest` so the matchers actually exist on
 * `expect` at test time. But `tsconfig.app.json` only includes `src/`, so a
 * type augmentation declared inside a file under `tests/` is invisible to any
 * `.test.tsx` file compiled as part of the `src` project — TypeScript only
 * "sees" a `declare module` augmentation for files in the same compilation.
 * This file re-states that reference from inside `src/` so both halves agree:
 * the matchers exist at runtime (via the setup file) AND the compiler knows
 * about them (via this one).
 */
/// <reference types="@testing-library/jest-dom/vitest" />
