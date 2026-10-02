import React from "react";
import { GOLD, GOLD_SOFT } from "./styles";

// The left half of the desktop entry screen: what the game is, next to the
// enlistment form. Phones go straight to the form.
const LandingHero: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "22px", padding: "12px 8px" }}>
    <div style={{ color: GOLD, fontFamily: "'Cinzel', serif", fontSize: "13px", letterSpacing: "5px" }}>
      BENGAL · 23 JUNE 1757
    </div>
    <p
      style={{
        margin: 0, fontFamily: "'Cinzel', serif", color: "#f3ead6",
        fontSize: "clamp(34px, 3.6vw, 52px)", lineHeight: 1.1, letterSpacing: "2px",
        textShadow: "0 4px 30px rgba(0,0,0,0.6)",
      }}
    >
      Trust no one in the Nawab's camp.
    </p>
    <p style={{ margin: 0, maxWidth: "520px", color: "#c9c2b3", fontFamily: "'EB Garamond', serif", fontSize: "20px", lineHeight: 1.5 }}>
      A social deduction game for 5 to 10 players. Loyal Nawabs must win three missions; the East
      India Company's agents hide among them and sabotage from within. Everyone plays on their own
      device.
    </p>
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", gap: "12px", flexWrap: "wrap" }}>
      {["5–10 players", "Hidden roles", "One device each"].map((item) => (
        <li
          key={item}
          style={{
            color: GOLD_SOFT, fontSize: "13px", letterSpacing: "1px",
            padding: "6px 14px", borderRadius: "999px",
            border: "1px solid rgba(197, 160, 89, 0.35)", backgroundColor: "rgba(197, 160, 89, 0.08)",
          }}
        >
          {item}
        </li>
      ))}
    </ul>
    <a href="/how-to-play" style={{ color: GOLD, fontSize: "16px", textUnderlineOffset: "3px", alignSelf: "flex-start" }}>
      New here? Read how to play →
    </a>
  </div>
);

export default LandingHero;
