import React from "react";
import type { Room } from "../../types/game";
import { GOLD, GOLD_SOFT, panelStyle } from "./styles";

interface WideHeaderProps {
  newConnection: "ok" | "error" | string;
  isConnectedToSocket: boolean;
  room: Room | null;
  playerId: string | null;
  roomCode: string;
  handleCopy: (type: "code" | "link") => void;
  copiedStatus: "code" | "link" | null;
  leaveRoom: () => void;
  // Tablets: tighter spacing, and connection/lock status as icons only, so the
  // bar stays on one line at 1024px.
  dense?: boolean;
}

// The tablet/desktop top bar: the title, connection status and, once you're in
// a room, everything the phone layout keeps in the operative drawer (your
// name, the HQ code, invite and leave), always in view.
const WideHeader: React.FC<WideHeaderProps> = ({
  newConnection,
  isConnectedToSocket,
  room,
  playerId,
  roomCode,
  handleCopy,
  copiedStatus,
  leaveRoom,
  dense = false,
}) => {
  const gap = dense ? "14px" : "22px";
  const me = room?.players.find((p) => p.id === playerId);

  return (
    <header
      style={{
        ...panelStyle,
        padding: dense ? "12px 16px" : "14px 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
        <img src="/Nawab.png" alt="" width={40} height={40} style={{ width: "40px", height: "40px", flexShrink: 0 }} />
        <h1 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: GOLD, lineHeight: 1.15 }}>
          <span style={{ display: "block", fontSize: "11px", letterSpacing: "4px", opacity: 0.8 }}>THE BATTLE OF</span>
          <span style={{ fontSize: dense ? "18px" : "22px", letterSpacing: dense ? "2px" : "3px", textShadow: "0 0 15px rgba(197, 160, 89, 0.25)" }}>
            POLASHI <span style={{ fontFamily: "'Noto Serif Bengali', serif" }}>(পলাশী)</span>
          </span>
        </h1>
      </div>

      {room && (
        <div style={{ display: "flex", alignItems: "center", gap, flexWrap: "wrap" }}>
          <div>
            <div style={labelStyle}>Operative</div>
            <div style={{ color: "#fff", fontFamily: "'Cinzel', serif", fontSize: "15px", letterSpacing: "1px" }}>
              {me?.name ?? "Unknown"}
            </div>
          </div>

          <div>
            <div style={labelStyle}>HQ Code</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: GOLD, fontFamily: "'Cinzel', serif", fontSize: "20px", fontWeight: 700, letterSpacing: "4px" }}>
                {roomCode}
              </span>
              <button
                onClick={() => handleCopy("code")}
                aria-label="Copy HQ code"
                title="Copy HQ code"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "4px" }}
              >
                {copiedStatus === "code" ? "✅" : "📋"}
              </button>
            </div>
          </div>

          <button
            onClick={() => handleCopy("link")}
            style={{
              backgroundColor: copiedStatus === "link" ? GOLD : "transparent",
              border: `1px solid ${GOLD}`,
              color: copiedStatus === "link" ? "#000" : GOLD,
              padding: "9px 14px",
              borderRadius: "6px",
              fontFamily: "'Cinzel', serif",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "1px",
              cursor: "pointer",
            }}
          >
            {copiedStatus === "link" ? "LINK COPIED" : "INVITE ALLIES"}
          </button>

          <span
            title={room.locked ? "Room locked" : "Room open"}
            style={{ fontSize: "12px", letterSpacing: "1px", color: room.locked ? "#ff922b" : "#00b894" }}
          >
            {room.locked ? "🔒" : "🔓"}{dense ? "" : room.locked ? " LOCKED" : " OPEN"}
          </span>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: dense ? "10px" : "16px" }}>
        <div
          style={{
            display: "inline-flex", gap: dense ? "8px" : "14px", alignItems: "center",
            fontSize: "10px", color: "#888", padding: dense ? "4px 10px" : "4px 14px",
            backgroundColor: "rgba(34, 34, 34, 0.8)", borderRadius: "20px",
            border: "1px solid #333", textTransform: "uppercase", letterSpacing: "1px",
          }}
        >
          <Status label="Internet" isOk={newConnection === "ok"} iconOnly={dense} />
          <Status label="Server" isOk={isConnectedToSocket} iconOnly={dense} />
        </div>
        {room && (
          <button
            onClick={leaveRoom}
            style={{
              background: "none", border: "1px solid #444", color: "#999",
              padding: "8px 12px", borderRadius: "6px", fontSize: "11px",
              letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Abandon Post
          </button>
        )}
      </div>
    </header>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  color: GOLD_SOFT,
  opacity: 0.7,
  letterSpacing: "2px",
  textTransform: "uppercase",
};

const Status = ({ label, isOk, iconOnly }: { label: string; isOk: boolean; iconOnly?: boolean }) => (
  <span title={`${label}: ${isOk ? "connected" : "disconnected"}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
    {iconOnly ? <span style={visuallyHidden}>{label}</span> : label}
    <span role="img" aria-label={isOk ? "connected" : "disconnected"} style={{ fontSize: "14px", color: isOk ? "#2f9e44" : "#e03131" }}>●</span>
  </span>
);

const visuallyHidden: React.CSSProperties = {
  position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px",
  overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", border: 0,
};

export default WideHeader;
