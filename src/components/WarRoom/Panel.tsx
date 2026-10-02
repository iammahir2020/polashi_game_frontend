import React from "react";
import { panelRuleStyle, panelStyle, panelTitleStyle } from "./styles";

interface PanelProps {
  title?: string;
  // Names the region for screen readers when there is no visible title.
  label?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

// One framed area of the war room, with an optional engraved heading.
const Panel: React.FC<PanelProps> = ({ title, label, style, children }) => (
  <section aria-label={title ?? label} style={{ ...panelStyle, ...style }}>
    {title && (
      <h2 style={panelTitleStyle}>
        {title}
        <span aria-hidden="true" style={panelRuleStyle} />
      </h2>
    )}
    {children}
  </section>
);

export default Panel;
