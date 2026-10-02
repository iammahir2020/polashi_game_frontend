import React from "react";

// The battlefield art behind the tablet and desktop layouts, dimmed so the
// panels stay readable. Fixed to the window, so it doesn't scroll with them.
// It's the portrait scene, not the wide share art: that one has the title
// painted in, which would show through behind the panels. Upscaled and dimmed,
// a slight blur keeps it reading as atmosphere.
const Backdrop: React.FC = () => (
  <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundColor: "#070707" }}>
    <picture>
      <source srcSet="/polashi_bg.webp" type="image/webp" />
      <img
        src="/polashi_bg.jpg"
        alt=""
        decoding="async"
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center 62%",
          filter: "saturate(0.85) blur(2px)", transform: "scale(1.03)",
        }}
      />
    </picture>
    {/* Dark wash plus a vignette: the art reads as atmosphere, not content */}
    <div
      style={{
        position: "absolute", inset: 0,
        background:
          "radial-gradient(ellipse at 50% 35%, rgba(7,7,7,0.80) 0%, rgba(7,7,7,0.90) 55%, rgba(7,7,7,0.97) 100%)",
      }}
    />
  </div>
);

export default Backdrop;
