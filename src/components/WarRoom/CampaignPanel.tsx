import React from "react";
import RoundTracker from "../RoundTracker";
import Panel from "./Panel";
import { GOLD, GOLD_SOFT, mutedTextStyle } from "./styles";
import { phaseMessage, type PhaseInput } from "./phase";
import { useI18n } from "../../i18n/useI18n";

type CampaignPanelProps = PhaseInput;

// The centre of the war room: mission track, score, the current General and
// what's happening now.
const CampaignPanel: React.FC<CampaignPanelProps> = (props) => {
  const { room, currentGeneral } = props;
  const i18n = useI18n();
  const { t, rich } = i18n;

  return (
    <Panel title={t("campaign.title", { round: Math.min(room.currentRound || 1, 5) })}>
      <RoundTracker room={room} />

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "18px", fontFamily: "'Cinzel', serif", margin: "4px 0 16px" }}>
        <Score label={t("campaign.nawabs")} value={i18n.num(room.scoreGreen ?? 0)} color="#40c057" />
        <span aria-hidden="true" style={{ color: "#555" }}>—</span>
        <Score label={t("campaign.company")} value={i18n.num(room.scoreRed ?? 0)} color="#ff7675" />
      </div>

      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap",
          padding: "12px 16px", borderRadius: "12px",
          border: "1px solid rgba(197, 160, 89, 0.3)", backgroundColor: "rgba(197, 160, 89, 0.06)",
        }}
      >
        <div style={{ color: GOLD_SOFT, fontSize: "14px", letterSpacing: "0.4px" }}>
          {rich("general.current", { name: currentGeneral?.name ?? t("general.noneAppointed") }, { color: GOLD })}
        </div>
        <p role="status" style={{ ...mutedTextStyle, fontStyle: "italic", fontSize: "15px" }}>
          {phaseMessage(props, i18n)}
        </p>
      </div>
    </Panel>
  );
};

const Score = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
    <span style={{ fontSize: "12px", letterSpacing: "2px", color: "#999", textTransform: "uppercase" }}>{label}</span>
    <span style={{ fontSize: "26px", fontWeight: 700, color }}>{value}</span>
  </div>
);

export default CampaignPanel;
