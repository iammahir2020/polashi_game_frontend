import React, { useState } from 'react';
import type { Room } from '../../types/game';

interface VotingSystemProps {
  room: Room | null;
  playerId: string | null;
  isGameMaster: boolean;
  handleYesVote: () => void;
  handleNoVote: () => void;
  handleClearVote: () => void;
  handleStartVote: () => void;
  handleStartSecretVote: () => void;
  primaryBtn: React.CSSProperties;
}

const VotingSystem: React.FC<VotingSystemProps> = ({
  room,
  playerId,
  isGameMaster,
  handleYesVote,
  handleNoVote,
  handleClearVote,
  handleStartVote,
  handleStartSecretVote,
  primaryBtn
}) => {
  if (!room?.voting) return null;

  const [pendingVote, setPendingVote] = useState<'yes' | 'no' | null>(null);

  const isTeamApproval = room.voting.type === "teamApproval";
  const hasVoted = playerId && room.voting.votes[playerId];
  const isOnMission = playerId && room.proposedTeam?.includes(playerId);
  const totalRequiredVotes = isTeamApproval ? room.players.length : (room.proposedTeam?.length || 0);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.92)", backdropFilter: "blur(8px)",
      zIndex: 20001, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center"
    }}>
      {/* 1. HEADER SECTION */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{ color: "#c5a059", fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", marginBottom: "8px" }}>
          {isTeamApproval ? "Royal Court" : "Battlefield"}
        </div>
        <h2 style={{
          color: "#fff", fontFamily: "'Cinzel', serif", fontSize: "32px", margin: 0,
          textShadow: "0 0 15px rgba(197, 160, 89, 0.3)"
        }}>
          {room.voting.active
            ? (isTeamApproval ? "Council Deliberation" : "Cast Secret Vote")
            : "The Final Verdict"}
        </h2>
        <div style={{ width: "100px", height: "1px", background: "linear-gradient(to right, transparent, #c5a059, transparent)", margin: "15px auto" }} />
      </div>

      {/* 2. TEAM BATTALION DISPLAY */}
      <div style={{ margin: "20px 0" }}>
        <p style={{ color: "#666", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" }}>
          Proposed Battalion:
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          {room.proposedTeam?.map((tid: string) => {
            const player = room.players.find((p: any) => p.id === tid);
            return (
              <span key={tid} style={{
                color: "#fff", fontSize: "18px", background: "rgba(197, 160, 89, 0.2)",
                padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(197, 160, 89, 0.3)"
              }}>
                {player?.name}
              </span>
            );
          })}
        </div>
      </div>

      {room.voting.active ? (
        <>
          {/* 3A. ACTIVE VOTING VIEW */}
          {(isTeamApproval || isOnMission) ? (
            <>
              <p style={{ color: "#888", fontFamily: "'EB Garamond', serif", fontSize: "18px", fontStyle: "italic", marginBottom: "30px" }}>
                {isTeamApproval
                  ? "The assembly awaits your decision. Choose wisely."
                  : "The fate of the mission rests in your hands. Act in secret."}
              </p>

              <div style={{
                backgroundColor: "rgba(255,255,255,0.03)", padding: "15px 30px", borderRadius: "50px",
                border: "1px solid rgba(197, 160, 89, 0.2)", color: "#c5a059", fontSize: "14px",
                marginBottom: "40px", display: 'inline-block'
              }}>
                Progress: <span style={{ color: "#fff", fontWeight: "bold" }}>{Object.keys(room.voting.votes).length}</span> / {totalRequiredVotes}
              </div>

              {!hasVoted ? (
                <div style={{ display: "flex", gap: "40px", justifyContent: "center" }}>
                  <VoteOption
                    label={isTeamApproval ? "APPROVE" : "SUCCESS"}
                    color="#40c057"
                    img={isTeamApproval ? "/green_seal.png" : "/green_card.png"}
                    onClick={() => isTeamApproval ? handleYesVote() : setPendingVote('yes')}
                  />
                  <VoteOption
                    label={isTeamApproval ? "REJECT" : "SABOTAGE"}
                    color="#ff7675"
                    img={isTeamApproval ? "/red_seal.png" : "/red_card.png"}
                    onClick={() => isTeamApproval ? handleNoVote() : setPendingVote('no')}
                  />
                </div>
              ) : (
                <div style={{ animation: "pulseOpacity 2s infinite" }}>
                  <p style={{ color: "#c5a059", fontSize: "20px", fontFamily: "Cinzel" }}>Decision Recorded</p>
                  <p style={{ color: "#666", fontSize: "14px" }}>Awaiting remaining members...</p>
                </div>
              )}
            </>
          ) : (
            /* SPECTATOR VIEW */
            <div style={{ padding: "40px", animation: "pulseOpacity 3s infinite" }}>
              <p style={{ color: "#c5a059", fontSize: "22px", fontFamily: "Cinzel", letterSpacing: "2px" }}>
                Mission in Progress...
              </p>
              <p style={{ color: "#666", fontSize: "16px", fontStyle: "italic" }}>
                The battalion is operating behind enemy lines. Await the outcome.
              </p>
            </div>
          )}
        </>
      ) : (
        /* 3B. RESULT VIEW */
        <div style={{ animation: "revealVerdict 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '40px', perspective: '1000px' }}>
            <div className="flipping-container">
              <img
                src={room.voting.result === "Yes"
                  ? (isTeamApproval ? "/green_seal.png" : "/green_card.png")
                  : (isTeamApproval ? "/red_seal.png" : "/red_card.png")}
                className="result-image-3d"
                style={{ height: isTeamApproval ? '130px' : 'auto', width: isTeamApproval ? 'auto' : '160px' }}
              />
            </div>
            <div className="verdict-text" style={{ color: room.voting.result === "Yes" ? "#40c057" : "#ff7675" }}>
              {isTeamApproval
                ? (room.voting.result === "Yes" ? "APPROVED" : "REJECTED")
                : (room.voting.result === "Yes" ? "MISSION SUCCESS" : "MISSION FAILED")}
            </div>
            <div className="shadow-fx" />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "30px", fontFamily: "Cinzel", fontSize: "18px" }}>
            <Tally count={Object.values(room.voting.votes).filter(v => v === "yes").length} color="#40c057" img={isTeamApproval ? "/green_seal.png" : "/green_card.png"} />
            <div style={{ width: "1px", backgroundColor: "#333" }} />
            <Tally count={Object.values(room.voting.votes).filter(v => v === "no").length} color="#ff7675" img={isTeamApproval ? "/red_seal.png" : "/red_card.png"} />
          </div>

          {isGameMaster && (
            <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={handleStartVote} style={{ ...primaryBtn, backgroundColor: "#c5a059", color: "#000", padding: "8px 25px" }}>Take Vote Again</button>
              <button onClick={handleClearVote} style={{ ...primaryBtn, backgroundColor: "transparent", color: "#888", border: "1px solid #888", padding: "8px 25px" }}>Dismiss</button>
              {room.voting.result === "Yes" && isTeamApproval && (
                <button onClick={handleStartSecretVote} style={{ ...primaryBtn, backgroundColor: "#c5a059", color: "#000", padding: "8px 25px" }}>Take Secret Vote</button>
              )}
            </div>
          )}
        </div>
      )}

      {isGameMaster && room.voting.active && (
        <div style={{ marginTop: "40px" }}>
          <button onClick={handleClearVote} className="cancel-btn">🚫 Cancel Voting Session</button>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {pendingVote && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.96)", zIndex: 30000,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <h2 style={{ color: "#fff", fontFamily: "Cinzel", marginBottom: "30px", letterSpacing: "2px" }}>
            Confirm Your Choice
          </h2>

          <div style={{ marginBottom: "40px", textAlign: "center" }}>
            <img
              src={pendingVote === 'yes' ? "/green_card.png" : "/red_card.png"}
              style={{ width: "200px", filter: "drop-shadow(0 0 30px rgba(197, 160, 89, 0.4))" }}
              alt="Selected Card"
            />
            <p style={{
              color: pendingVote === 'yes' ? "#40c057" : "#ff7675",
              fontSize: "24px", fontWeight: "bold", marginTop: "20px"
            }}>
              {pendingVote === 'yes' ? "SUCCESS" : "SABOTAGE"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "20px" }}>
            <button
              onClick={() => {
                if (pendingVote === 'yes') handleYesVote();
                else handleNoVote();
                setPendingVote(null);
              }}
              style={{ ...primaryBtn, backgroundColor: "#c5a059", color: "#000", padding: "12px 40px" }}
            >
              CONFIRM
            </button>
            <button
              onClick={() => setPendingVote(null)}
              style={{ ...primaryBtn, backgroundColor: "transparent", color: "#888", border: "1px solid #444", padding: "12px 40px" }}
            >
              GO BACK
            </button>
          </div>
        </div>
      )}

      <VotingStyles />
    </div>
  );
};

// --- SMALL HELPER COMPONENTS ---

const VoteOption = ({ label, color, img, onClick }: any) => (
  <div style={{ textAlign: 'center' }}>
    <button onClick={onClick} className="vote-btn">
      <img src={img} alt={label} style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
    </button>
    <p style={{ fontFamily: "Cinzel", color, marginTop: '10px', fontSize: '14px' }}>{label}</p>
  </div>
);

const Tally = ({ count, color, img }: any) => (
  <div style={{ color, display: 'flex', alignItems: 'center', gap: '8px' }}>
    <img src={img} style={{ width: '25px' }} />
    {count}
  </div>
);

const VotingStyles = () => (
  <style>{`
.vote-btn { background: none; border: none; cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 0; }
      .vote-btn:hover { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(197, 160, 89, 0.4)); }
      .cancel-btn { background: rgba(255, 118, 117, 0.05); color: #ff7675; border: 1px solid rgba(255, 118, 117, 0.3); padding: 10px 24px; border-radius: 8px; font-size: 12px; cursor: pointer; text-transform: uppercase; font-weight: bold; transition: 0.2s; }
      .cancel-btn:hover { background: rgba(255, 118, 117, 0.15); border-color: #ff7675; }
      .flipping-container { width: 140px; height: 140px; position: absolute; top: 50%; left: 50%; transform-style: preserve-3d; animation: royalFlip 8s infinite linear, levitate 4s infinite ease-in-out; display: flex; align-items: center; justify-content: center; }
      .result-image-3d { width: 130px; opacity: 0.4; filter: drop-shadow(0 0 20px rgba(197, 160, 89, 0.4)); backface-visibility: visible; }
      .verdict-text { font-size: 50px; font-weight: bold; fontFamily: 'Cinzel', serif; position: relative; z-index: 10; pointer-events: none; text-shadow: 0 0 20px rgba(0,0,0,0.5); }
      .shadow-fx { position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%); width: 60px; height: 10px; background: radial-gradient(ellipse at center, rgba(197, 160, 89, 0.2) 0%, transparent 70%); border-radius: 50%; filter: blur(5px); animation: shadowPulse 4s infinite ease-in-out; }
      
      @keyframes revealVerdict { 0% { opacity: 0; transform: translateY(20px) scale(0.9); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes royalFlip { 0% { transform: translate(-50%, -50%) rotateY(0deg); } 100% { transform: translate(-50%, -50%) rotateY(360deg); } }
      @keyframes levitate { 0%, 100% { margin-top: -10px; } 50% { margin-top: 10px; } }
      @keyframes shadowPulse { 0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.3; } 50% { transform: translateX(-50%) scale(0.7); opacity: 0.1; } }
      @keyframes pulseOpacity { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `}</style>
);

export default VotingSystem;