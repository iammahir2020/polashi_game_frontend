import { useSyncExternalStore } from "react";

// Which arrangement of the game screen fits the window:
//   compact  phones: one column (the original layout)
//   medium   tablets and small laptops: main board plus one sidebar
//   wide     laptops and desktops: three-column war room
export type Layout = "compact" | "medium" | "wide";

export const MEDIUM_QUERY = "(min-width: 768px)";
export const WIDE_QUERY = "(min-width: 1200px)";

function canMatch(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function readLayout(): Layout {
  // Without media queries (tests, very old browsers) fall back to the phone
  // layout, which works at any width.
  if (!canMatch()) return "compact";
  if (window.matchMedia(WIDE_QUERY).matches) return "wide";
  if (window.matchMedia(MEDIUM_QUERY).matches) return "medium";
  return "compact";
}

function subscribe(onChange: () => void): () => void {
  if (!canMatch()) return () => {};
  const queries = [window.matchMedia(MEDIUM_QUERY), window.matchMedia(WIDE_QUERY)];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

export function useLayout(): Layout {
  return useSyncExternalStore(subscribe, readLayout, () => "compact");
}
