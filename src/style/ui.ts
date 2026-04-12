import type { CSSProperties } from "react";

export const uiButtonBase: CSSProperties = {
  borderRadius: "8px",
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 700,
  transition: "all 0.2s ease",
};

export const uiButtonGhost: CSSProperties = {
  ...uiButtonBase,
  border: "1px solid #444",
  background: "transparent",
  color: "#aaa",
};

export const uiButtonGold: CSSProperties = {
  ...uiButtonBase,
  border: "1px solid #c5a059",
  background: "rgba(197, 160, 89, 0.12)",
  color: "#e7d6ad",
};
