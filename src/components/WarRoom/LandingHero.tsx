import React from "react";
import { GOLD, GOLD_SOFT } from "./styles";
import { useI18n } from "../../i18n/useI18n";

// The left half of the desktop entry screen: what the game is, next to the
// enlistment form. Phones go straight to the form.
const LandingHero: React.FC = () => {
  const { t } = useI18n();
  return (
  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "22px", padding: "12px 8px" }}>
    <div style={{ color: GOLD, fontFamily: "'Cinzel', serif", fontSize: "13px", letterSpacing: "5px" }}>
      {t("title.landingKicker")}
    </div>
    <p
      style={{
        margin: 0, fontFamily: "'Cinzel', serif", color: "#f3ead6",
        fontSize: "clamp(34px, 3.6vw, 52px)", lineHeight: 1.1, letterSpacing: "2px",
        textShadow: "0 4px 30px rgba(0,0,0,0.6)",
      }}
    >
      {t("hero.tagline")}
    </p>
    <p style={{ margin: 0, maxWidth: "520px", color: "#c9c2b3", fontFamily: "'EB Garamond', serif", fontSize: "20px", lineHeight: 1.5 }}>
      {t("hero.body")}
    </p>
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", gap: "12px", flexWrap: "wrap" }}>
      {[t("hero.players"), t("hero.roles"), t("hero.devices")].map((item) => (
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
      {t("hero.howTo")}
    </a>
  </div>
  );
};

export default LandingHero;
