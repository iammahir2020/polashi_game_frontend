import React, { useEffect, useRef, useState } from 'react';
import type { Room, VotingState } from '../../types/game';
import { useOverlayA11y } from '../../hooks/useOverlayA11y';
import {
  hasPlayerVoted,
  pendingVoters as selectPendingVoters,
  voteTally,
  votesCastCount,
} from './voteSelectors';
import { useI18n } from '../../i18n/useI18n';

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
  // Tablet/desktop: the vote plays out in a panel of the war room, so the
  // roster and your role stay in view. Phones keep the full-screen overlay.
  inline?: boolean;
}

type ActiveVotingProps = Omit<VotingSystemProps, 'room'> & {
  room: Room & { voting: VotingState };
};

const VotingSystem: React.FC<VotingSystemProps> = ({ room, ...rest }) => {
  if (!room?.voting) return null;
  return <VotingSession room={{ ...room, voting: room.voting }} {...rest} />;
};

const VotingSession: React.FC<ActiveVotingProps> = ({
  room,
  playerId,
  isGameMaster,
  handleYesVote,
  handleNoVote,
  handleClearVote,
  handleStartVote,
  handleStartSecretVote,
  primaryBtn,
  inline = false
}) => {
  const { t, rich } = useI18n();
  const [pendingVote, setPendingVote] = useState<'yes' | 'no' | null>(null);

  const isTeamApproval = room.voting.type === "teamApproval";
  const currentVotes = room.voting?.votes ?? {};
  const hasVoted = Boolean(playerId && hasPlayerVoted(currentVotes, playerId));
  const isOnMission = playerId && room.proposedTeam?.includes(playerId);
  // The council is the battalion (activePlayerIds), as the server counts it:
  // observers in the room don't vote, so they're neither counted nor awaited.
  const totalRequiredVotes = isTeamApproval ? (room.activePlayerIds?.length ?? 0) : (room.proposedTeam?.length || 0);
  const eligibleVoterIds = isTeamApproval
    ? (room.activePlayerIds ?? [])
    : (room.proposedTeam ?? []);
  const pendingTeamApprovalVoters = isTeamApproval
    ? selectPendingVoters(room.players, currentVotes, eligibleVoterIds)
    : [];
  const pendingSecretVoters = !isTeamApproval
    ? selectPendingVoters(room.players, currentVotes, eligibleVoterIds)
    : [];
  const pendingVoters = isTeamApproval ? pendingTeamApprovalVoters : pendingSecretVoters;
  const overlayRef = useRef<HTMLDivElement>(null);

  const me = room.players.find(p => p.id === playerId);
  const isNawab = me?.character?.team === "Nawabs";

  const handleOverlayClose = () => {
    if (pendingVote) {
      setPendingVote(null);
      return;
    }
    if (isGameMaster && room.voting?.active) {
      handleClearVote();
    }
  };

  // Focus trap and Escape only for the full-screen overlay; inline, the rest
  // of the page stays usable.
  useOverlayA11y({ isActive: !inline, onClose: handleOverlayClose, containerRef: overlayRef });

  // Inline, bring the vote into view when it opens and when its verdict lands,
  // since it may start below the fold of the war room.
  useEffect(() => {
    if (!inline) return;
    overlayRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [inline, room.voting.type, room.voting.active]);

  // Spacing: the full-screen overlay has room to breathe; the inline panel keeps
  // the choices above the fold.
  const space = (overlay: string, inlineValue: string) => (inline ? inlineValue : overlay);

  const containerProps = inline
    ? { role: "region", "aria-label": t('vote.aria'), style: inlineContainerStyle }
    : {
        role: "dialog", "aria-modal": true, "aria-label": t('vote.aria'), tabIndex: -1,
        style: overlayContainerStyle,
      };

  return (
    <div ref={overlayRef} {...containerProps}>
      {/* 1. HEADER SECTION */}
      <div style={{ marginBottom: space("30px", "12px") }}>
        <div style={{ color: "#c5a059", fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", marginBottom: "8px" }}>
          {isTeamApproval ? t('vote.royalCourt') : t('vote.battlefield')}
        </div>
        <h2 style={{
          color: "#fff", fontFamily: "'Cinzel', serif", fontSize: "32px", margin: 0,
          textShadow: "0 0 15px rgba(197, 160, 89, 0.3)"
        }}>
          {room.voting.active
            ? (isTeamApproval ? t('vote.councilTitle') : t('vote.secretTitle'))
            : t('vote.verdictTitle')}
        </h2>
        <div style={{ width: "100px", height: "1px", background: "linear-gradient(to right, transparent, #c5a059, transparent)", margin: "15px auto" }} />
      </div>

      {/* 2. TEAM BATTALION DISPLAY */}
      <div style={{ margin: space("20px 0", "4px 0 12px") }}>
        <p style={{ color: "#666", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" }}>
          {t('vote.proposed')}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          {room.proposedTeam?.map((tid: string) => {
            const player = room.players.find((p) => p.id === tid);
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
              <p style={{ color: "#888", fontFamily: "'EB Garamond', serif", fontSize: "18px", fontStyle: "italic", marginBottom: space("30px", "14px") }}>
                {isTeamApproval
                  ? t('vote.councilPrompt')
                  : t('vote.missionPrompt')}
              </p>

              <div style={{
                backgroundColor: "rgba(255,255,255,0.03)", padding: "15px 30px", borderRadius: "50px",
                border: "1px solid rgba(197, 160, 89, 0.2)", color: "#c5a059", fontSize: "14px",
                marginBottom: space("40px", "18px"), display: 'inline-block'
              }}>
                {rich('vote.progress', { cast: votesCastCount(currentVotes), total: totalRequiredVotes }, { color: "#fff", fontWeight: "bold" })}
              </div>

              {pendingVoters.length > 0 && (
                <div style={{ marginBottom: space("24px", "16px"), maxWidth: "680px" }}>
                  <p style={{ color: "#9a9a9a", fontSize: "11px", letterSpacing: "1.6px", textTransform: "uppercase", marginBottom: "10px" }}>
                    {t('vote.awaiting')}
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
                    {pendingVoters.map((p) => (
                      <span
                        key={p.id}
                        style={{
                          color: "#ffe5b3",
                          fontSize: "12px",
                          border: "1px solid rgba(197, 160, 89, 0.4)",
                          backgroundColor: "rgba(197, 160, 89, 0.08)",
                          borderRadius: "999px",
                          padding: "4px 10px"
                        }}
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!hasVoted ? (
                <div style={{ display: "flex", gap: "40px", justifyContent: "center" }}>
                  <ShuffledVoteOptions
                    key={room.voting.type}
                    isTeamApproval={isTeamApproval}
                    onYes={() => isTeamApproval ? handleYesVote() : setPendingVote('yes')}
                    onNo={() => isTeamApproval ? handleNoVote() : setPendingVote('no')}
                  />
                </div>
              ) : (
                <div style={{ animation: "pulseOpacity 2s infinite" }}>
                  <p style={{ color: "#c5a059", fontSize: "20px", fontFamily: "Cinzel" }}>{t('vote.recorded')}</p>
                  <p style={{ color: "#666", fontSize: "14px" }}>{t('vote.awaitingRest')}</p>
                </div>
              )}
            </>
          ) : (
            /* SPECTATOR VIEW */
            <div style={{ padding: space("40px", "12px"), animation: "pulseOpacity 3s infinite" }}>
              {!isTeamApproval && pendingSecretVoters.length > 0 && (
                <div style={{ marginBottom: "20px", maxWidth: "680px" }}>
                  <p style={{ color: "#9a9a9a", fontSize: "11px", letterSpacing: "1.6px", textTransform: "uppercase", marginBottom: "10px" }}>
                    {t('vote.awaitingSecret')}
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
                    {pendingSecretVoters.map((p) => (
                      <span
                        key={p.id}
                        style={{
                          color: "#ffe5b3",
                          fontSize: "12px",
                          border: "1px solid rgba(197, 160, 89, 0.4)",
                          backgroundColor: "rgba(197, 160, 89, 0.08)",
                          borderRadius: "999px",
                          padding: "4px 10px"
                        }}
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p style={{ color: "#c5a059", fontSize: "22px", fontFamily: "Cinzel", letterSpacing: "2px" }}>
                {t('vote.inProgress')}
              </p>
              <p style={{ color: "#666", fontSize: "16px", fontStyle: "italic" }}>
                {t('vote.inProgressHint')}
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
                ? (room.voting.result === "Yes" ? t('vote.approved') : t('vote.rejected'))
                : (room.voting.result === "Yes" ? t('vote.missionSuccess') : t('vote.missionFailed'))}
            </div>
            <div className="shadow-fx" />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "30px", fontFamily: "Cinzel", fontSize: "18px" }}>
            <Tally count={voteTally(currentVotes).yes} color="#40c057" img={isTeamApproval ? "/green_seal.png" : "/green_card.png"} />
            <div style={{ width: "1px", backgroundColor: "#333" }} />
            <Tally count={voteTally(currentVotes).no} color="#ff7675" img={isTeamApproval ? "/red_seal.png" : "/red_card.png"} />
          </div>

          {isGameMaster && (
            <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={handleStartVote} style={{ ...primaryBtn, backgroundColor: "#c5a059", color: "#000", padding: "8px 25px" }}>{t('vote.again')}</button>
              <button onClick={handleClearVote} style={{ ...primaryBtn, backgroundColor: "transparent", color: "#888", border: "1px solid #888", padding: "8px 25px" }}>{t('vote.dismiss')}</button>
              {room.voting.result === "Yes" && isTeamApproval && (
                <button onClick={handleStartSecretVote} style={{ ...primaryBtn, backgroundColor: "#c5a059", color: "#000", padding: "8px 25px" }}>{t('vote.takeSecret')}</button>
              )}
            </div>
          )}
        </div>
      )}

      {isGameMaster && room.voting.active && (
        <div style={{ marginTop: space("40px", "22px") }}>
          <button onClick={handleClearVote} className="cancel-btn">{t('vote.cancel')}</button>
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
            {t('vote.confirmTitle')}
          </h2>

          <div style={{ marginBottom: "40px", textAlign: "center" }}>
            <img
              src={pendingVote === 'yes' ? "/green_card.png" : "/red_card.png"}
              style={{ width: "200px", filter: "drop-shadow(0 0 30px rgba(197, 160, 89, 0.4))" }}
              alt={t('vote.selectedCard')}
            />
            <p style={{
              color: pendingVote === 'yes' ? "#40c057" : "#ff7675",
              fontSize: "24px", fontWeight: "bold", marginTop: "20px"
            }}>
              {pendingVote === 'yes' ? t('vote.success') : t('vote.sabotage')}
            </p>
          </div>

          <div style={{ display: "flex", gap: "20px" }}>
            <button
              onClick={() => {
                if (pendingVote === 'yes'){
                  handleYesVote();
                } 
                else {
                  // If it's a mission (not team approval) and player is Nawab
                  // Clicking sabotage results in a "Yes" vote anyway.
                  if (!isTeamApproval && isNawab) {
                    handleYesVote(); 
                  } else {
                    handleNoVote();
                  }
                };
                setPendingVote(null);
              }}
              style={{ ...primaryBtn, backgroundColor: "#c5a059", color: "#000", padding: "12px 40px", whiteSpace: "nowrap" }}
            >
              {t('vote.confirm')}
            </button>
            <button
              onClick={() => setPendingVote(null)}
              style={{ ...primaryBtn, backgroundColor: "transparent", color: "#888", border: "1px solid #444", padding: "12px 40px", whiteSpace: "nowrap" }}
            >
              {t('vote.goBack')}
            </button>
          </div>
        </div>
      )}

      <VotingStyles />
    </div>
  );
};

const overlayContainerStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.92)", backdropFilter: "blur(8px)",
  zIndex: 20001, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center"
};

const inlineContainerStyle: React.CSSProperties = {
  position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
  textAlign: "center", padding: "32px 24px",
  backgroundColor: "rgba(10, 10, 10, 0.9)",
  border: "1px solid rgba(197, 160, 89, 0.55)", borderRadius: "16px",
  boxShadow: "0 0 40px rgba(197, 160, 89, 0.12), 0 18px 40px rgba(0, 0, 0, 0.5)",
};

// --- SMALL HELPER COMPONENTS ---

type VoteOptionProps = { label: string; color: string; img: string; onClick: () => void };

const VoteOption = ({ label, color, img, onClick }: VoteOptionProps) => (
  <div style={{ textAlign: 'center' }}>
    <button onClick={onClick} className="vote-btn">
      <img src={img} alt={label} style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
    </button>
    <p style={{ fontFamily: "Cinzel", color, marginTop: '10px', fontSize: '14px' }}>{label}</p>
  </div>
);

type ShuffledVoteOptionsProps = {
  isTeamApproval: boolean;
  onYes: () => void;
  onNo: () => void;
};

// The order is randomized so players can't read each other's choice from where
// they tap. It is rolled once on mount, and this only mounts while a vote is open,
// so every new vote gets a fresh order.
const ShuffledVoteOptions = ({ isTeamApproval, onYes, onNo }: ShuffledVoteOptionsProps) => {
  const { t } = useI18n();
  const [yesFirst] = useState(() => Math.random() < 0.5);

  const yes = (
    <VoteOption
      key="yes"
      label={isTeamApproval ? t('vote.approve') : t('vote.success')}
      color="#40c057"
      img={isTeamApproval ? "/green_seal.png" : "/green_card.png"}
      onClick={onYes}
    />
  );
  const no = (
    <VoteOption
      key="no"
      label={isTeamApproval ? t('vote.reject') : t('vote.sabotage')}
      color="#ff7675"
      img={isTeamApproval ? "/red_seal.png" : "/red_card.png"}
      onClick={onNo}
    />
  );

  return <>{yesFirst ? [yes, no] : [no, yes]}</>;
};

type TallyProps = { count: number; color: string; img: string };

const Tally = ({ count, color, img }: TallyProps) => {
  const { num } = useI18n();
  return (
    <div style={{ color, display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img src={img} style={{ width: '25px' }} />
      {num(count)}
    </div>
  );
};

const VotingStyles = () => (
  <style>{`
.vote-btn { background: none; border: none; cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 0; }
      .vote-btn:hover { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(197, 160, 89, 0.4)); }
      .cancel-btn { background: rgba(255, 118, 117, 0.05); color: #ff7675; border: 1px solid rgba(255, 118, 117, 0.3); padding: 10px 24px; border-radius: 8px; font-size: 12px; cursor: pointer; text-transform: uppercase; font-weight: bold; transition: 0.2s; }
      .cancel-btn:hover { background: rgba(255, 118, 117, 0.15); border-color: #ff7675; }
      .flipping-container { width: 140px; height: 140px; position: absolute; top: 50%; left: 50%; transform-style: preserve-3d; animation: royalFlip 8s infinite linear, levitate 4s infinite ease-in-out; display: flex; align-items: center; justify-content: center; }
      .result-image-3d { width: 130px; opacity: 0.4; filter: drop-shadow(0 0 20px rgba(197, 160, 89, 0.4)); backface-visibility: visible; }
      .verdict-text { font-size: 50px; font-weight: bold; font-family: 'Cinzel', serif; position: relative; z-index: 10; pointer-events: none; text-shadow: 0 0 20px rgba(0,0,0,0.5); }
      .shadow-fx { position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%); width: 60px; height: 10px; background: radial-gradient(ellipse at center, rgba(197, 160, 89, 0.2) 0%, transparent 70%); border-radius: 50%; filter: blur(5px); animation: shadowPulse 4s infinite ease-in-out; }
      
      @keyframes revealVerdict { 0% { opacity: 0; transform: translateY(20px) scale(0.9); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes royalFlip { 0% { transform: translate(-50%, -50%) rotateY(0deg); } 100% { transform: translate(-50%, -50%) rotateY(360deg); } }
      @keyframes levitate { 0%, 100% { margin-top: -10px; } 50% { margin-top: 10px; } }
      @keyframes shadowPulse { 0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.3; } 50% { transform: translateX(-50%) scale(0.7); opacity: 0.1; } }
      @keyframes pulseOpacity { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `}</style>
);

export default VotingSystem;