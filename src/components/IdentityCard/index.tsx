import React from 'react';
import type { CharacterType } from '../../types/game';

interface IdentityCardProps {
    isRevealed: boolean;
    setIsRevealed: (value: boolean) => void;
    character?: CharacterType | null;
    secretIntel?: string[];
    gameStarted?: boolean;
}

const IdentityCard: React.FC<IdentityCardProps> = ({ isRevealed, setIsRevealed, character, secretIntel, gameStarted }) => {

  if (!gameStarted || !character) return null;

  const isNawab = character.team === "Nawabs" || character.team.includes("Nawabs");

  return (
    <div
      onClick={() => setIsRevealed(!isRevealed)}
      style={{
        perspective: "1000px",
        margin: "25px 0",
        cursor: "pointer",
        height: "450px", // Increased slightly to ensure Intel fits
      }}
    >
      <div style={{
        position: "relative",
        width: "100%",
        height: "100%",
        transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        transformStyle: "preserve-3d",
        transform: isRevealed ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>

        {/* --- FRONT: CLASSIFIED SIDE --- */}
        <div style={frontCardStyle}>
          {/* Corner Ornaments */}
          <CornerDecoration />
          
          <div style={emblemContainerStyle}>
            <div style={emblemEmojiStyle}>📜</div>
          </div>

          <div style={{ marginTop: "20px", textAlign: "center", zIndex: 2 }}>
            <h2 style={classifiedTextStyle}>Classified</h2>
            <div style={dividerStyle} />
            <p style={{ color: "#888", fontSize: "12px", fontStyle: "italic", fontFamily: "'EB Garamond', serif" }}>
              Tap to reveal your destiny
            </p>
          </div>
          <div className="texture-overlay" />
        </div>

        {/* --- BACK: IDENTITY SIDE --- */}
        <div style={{
          ...backCardStyle,
          border: `3px solid ${isNawab ? "#1b4332" : "#7b1113"}`,
        }}>
          <div className="shimmer-effect" />

          {/* Team Icon */}
          <div style={teamIconWrapperStyle}>
            <img
              src={isNawab ? "/Nawab.png" : "/EIC.png"}
              alt="Team Badge"
              style={{ width: "90px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }}
            />
          </div>

          <h1 style={characterNameStyle}>{character.name}</h1>

          <div style={teamBadgeStyle}>{character.team.toUpperCase()}</div>

          <p style={descriptionStyle}>"{character.description}"</p>

          {/* SECRET INTELLIGENCE */}
          {secretIntel && secretIntel.length > 0 && (
            <div style={intelBoxStyle}>
              <p style={intelHeaderStyle}>Secret Intelligence</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {secretIntel.map((intel, idx) => (
                  <div key={idx} style={intelItemStyle}>{intel}</div>
                ))}
              </div>
            </div>
          )}

          {/* AUTO-HIDE TIMER BAR */}
          {isRevealed && (
            <div style={timerTrackStyle}>
              <div style={{
                ...timerBarStyle,
                backgroundColor: isNawab ? "#1b4332" : "#7b1113",
              }} />
            </div>
          )}
        </div>
      </div>
      <CardAnimations />
    </div>
  );
};

// --- STYLES & SUB-COMPONENTS ---

const frontCardStyle: React.CSSProperties = {
  position: "absolute", width: "100%", height: "100%",
  backfaceVisibility: "hidden", backgroundColor: "#1a1a1a",
  borderRadius: "20px", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", border: "8px solid #c5a059",
  boxShadow: "0 15px 35px rgba(0,0,0,0.5), inset 0 0 50px rgba(0,0,0,0.8)",
  overflow: "hidden"
};

const backCardStyle: React.CSSProperties = {
  position: "absolute", width: "100%", height: "100%",
  backfaceVisibility: "hidden", backgroundColor: "rgb(197, 160, 89)",
  borderRadius: "20px", transform: "rotateY(180deg)",
  display: "flex", flexDirection: "column", alignItems: "center",
  justifyContent: "center", padding: "20px", boxSizing: "border-box",
  boxShadow: "0 15px 35px rgba(0,0,0,0.5)", overflow: 'hidden'
};

const classifiedTextStyle: React.CSSProperties = { color: "#c5a059", margin: 0, letterSpacing: "4px", textTransform: "uppercase", fontSize: "18px", fontFamily: "'Cinzel', serif" };
const dividerStyle: React.CSSProperties = { width: "60px", height: "2px", backgroundColor: "#c5a059", margin: "10px auto", opacity: 0.6 };
const emblemContainerStyle: React.CSSProperties = { width: "140px", height: "140px", border: "2px double #c5a059", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle, #2d3436 0%, #1a1a1a 100%)", boxShadow: "0 0 20px rgba(197, 160, 89, 0.2)" };
const emblemEmojiStyle: React.CSSProperties = { fontSize: "50px", filter: "drop-shadow(0 0 10px rgba(197, 160, 89, 0.5))", animation: "floating 3s infinite ease-in-out" };
const teamIconWrapperStyle: React.CSSProperties = { width: "80px", height: "80px", borderRadius: "50%", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px" };
const characterNameStyle: React.CSSProperties = { fontFamily: "'Cinzel', serif", fontSize: "28px", fontWeight: 700, color: "black", margin: "0 0 2px 0", textAlign: 'center' };
const teamBadgeStyle: React.CSSProperties = { padding: "2px 12px", background: "rgba(0,0,0,0.8)", borderRadius: "4px", fontSize: "11px", color: "#c5a059", marginBottom: "12px", fontFamily: "'Cinzel', serif", letterSpacing: '1px' };
const descriptionStyle: React.CSSProperties = { fontFamily: "'EB Garamond', serif", fontSize: "16px", fontStyle: "italic", lineHeight: "1.3", color: "rgba(0,0,0,0.8)", fontWeight: 600, textAlign: "center", margin: "0 0 15px 0" };
const intelBoxStyle: React.CSSProperties = { width: "100%", backgroundColor: "rgba(0,0,0,0.15)", borderRadius: "10px", padding: "12px", border: "1px dashed rgba(0,0,0,0.3)", boxSizing: "border-box" };
const intelHeaderStyle: React.CSSProperties = { margin: "0 0 8px 0", fontSize: "14px", color: "black", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold", fontFamily: "'Cinzel', serif", textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "4px" };
const intelItemStyle: React.CSSProperties = { fontSize: "16px", color: "black", fontFamily: "'EB Garamond', serif", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" };
const timerTrackStyle: React.CSSProperties = { position: "absolute", bottom: "0", left: "0", height: "6px", backgroundColor: "rgba(0,0,0,0.3)", width: "100%" };
const timerBarStyle: React.CSSProperties = { height: "100%", animation: "burnTimer 8s linear forwards" };

const CornerDecoration = () => (
  <>
    {[{ top: 10, left: 10 }, { top: 10, right: 10 }, { bottom: 10, left: 10 }, { bottom: 10, right: 10 }].map((pos, i) => (
      <div key={i} style={{ position: "absolute", width: "30px", height: "30px", border: "2px solid #c5a059", opacity: 0.5, ...pos, transform: i === 1 ? 'rotate(90deg)' : i === 2 ? 'rotate(-90deg)' : i === 3 ? 'rotate(180deg)' : 'none' }} />
    ))}
  </>
);

const CardAnimations = () => (
  <style>{`
    @keyframes burnTimer { from { width: 100%; } to { width: 0%; } }
    @keyframes floating { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    .shimmer-effect { position: absolute; top: 0; left: -150%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); transform: skewX(-20deg); animation: shimmer 3s infinite linear; }
    @keyframes shimmer { 0% { left: -150%; } 100% { left: 150%; } }
    .texture-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.05; background-image: url("https://www.transparenttextures.com/patterns/dark-matter.png"); pointer-events: none; }
  `}</style>
);

export default IdentityCard;