import type { CSSProperties } from "react";

// Shared look of the tablet and desktop layouts: dark glass panels with a thin
// gold edge over the dimmed battlefield art. The phone layout doesn't use these.
// No backdrop-filter: it would make a panel the containing block for the
// position: fixed dialogs some panels open (vote confirmation, character picker).

export const GOLD = "#c5a059";
export const GOLD_SOFT = "#e7d6ad";

export const panelStyle: CSSProperties = {
  position: "relative",
  backgroundColor: "rgba(14, 14, 14, 0.86)",
  border: "1px solid rgba(197, 160, 89, 0.22)",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
  minWidth: 0,
};

export const panelTitleStyle: CSSProperties = {
  margin: "0 0 14px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: GOLD,
  fontFamily: "'Cinzel', serif",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "3px",
  textTransform: "uppercase",
};

export const panelRuleStyle: CSSProperties = {
  flex: 1,
  height: "1px",
  background: "linear-gradient(to right, rgba(197, 160, 89, 0.45), transparent)",
};

export const columnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  minWidth: 0,
};

export const mutedTextStyle: CSSProperties = {
  color: "#a8a8a8",
  fontFamily: "'EB Garamond', serif",
  fontSize: "16px",
  lineHeight: 1.5,
  margin: 0,
};
