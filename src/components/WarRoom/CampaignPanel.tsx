import React from "react";
import RoundTracker from "../RoundTracker";
import Panel from "./Panel";
import { GOLD, GOLD_SOFT, mutedTextStyle } from "./styles";
import { phaseMessage, type PhaseInput } from "./phase";

type CampaignPanelProps = PhaseInput;

// The centre of the war room: mission track, score, the current General and
// what's happening now.
const CampaignPanel: React.FC<CampaignPanelProps> = (props) => {
  const { room, currentGeneral } = props;

  return (
    <Panel title={`Mission ${Math.min(room.currentRound || 1, 5)} of 5`}>
      <RoundTracker room={room} />

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "18px", fontFamily: "'Cinzel', serif", margin: "4px 0 16px" }}>
        <Score label="Nawabs" value={room.scoreGreen ?? 0} color="#40c057" />
        <span aria-hidden="true" style={{ color: "#555" }}>—</span>
        <Score label="Company" value={room.scoreRed ?? 0} color="#ff7675" />
      </div>

      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap",
          padding: "12px 16px", borderRadius: "12px",
          border: "1px solid rgba(197, 160, 89, 0.3)", backgroundColor: "rgba(197, 160, 89, 0.06)",
        }}
      >
        <div style={{ color: GOLD_SOFT, fontSize: "14px", letterSpacing: "0.4px" }}>
          Current General: <strong style={{ color: GOLD }}>{currentGeneral?.name ?? "None appointed"}</strong>
        </div>
        <p role="status" style={{ ...mutedTextStyle, fontStyle: "italic", fontSize: "15px" }}>
          {phaseMessage(props)}
        </p>
      </div>
    </Panel>
  );
};

const Score = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
    <span style={{ fontSize: "12px", letterSpacing: "2px", color: "#999", textTransform: "uppercase" }}>{label}</span>
    <span style={{ fontSize: "26px", fontWeight: 700, color }}>{value}</span>
  </div>
);

export default CampaignPanel;
