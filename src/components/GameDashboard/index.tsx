import { useEffect, useState } from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import type { Player, Room } from "../../types/game";
import { socketService } from "../../services/socket";
import GameLoader from "../Loader";

export default function GameDashboard() {
  const isConnectedToSocket = useNetworkStatus();
  const [room, setRoom] = useState<Room | null>(null);
  const [roomCode, setRoomCode] = useState(localStorage.getItem("roomCode") || "");
  const [name, setName] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(localStorage.getItem("playerId") || null);
  const [wasKicked, setWasKicked] = useState(false);
  const [error, setError] = useState("");
  const [newConnection, setNetConnection] = useState<"ok" | "down">("down");
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<"code" | "link" | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(!!localStorage.getItem("roomCode"));
  const [currentGeneral, setCurrentGeneral] = useState<Player | null>(null);
  const [generalReveal, setGeneralReveal] = useState<{ name: string, active: boolean, flipping: boolean } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"create" | "join" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');

    if (urlRoom) {
      setRoomCode(urlRoom.toUpperCase());

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    socketService.onGeneralAnimation((data) => {
      setGeneralReveal({ name: data.name, active: true, flipping: true });

      setTimeout(() => {
        setGeneralReveal(prev => prev ? { ...prev, flipping: false } : null);
      }, 2000);

    });

    return () => {
      socketService.offGeneralAnimation();
    };
  }, []);


  useEffect(() => {
    socketService.connect();

    // 1. Listen for room joined (New join OR Reconnect success)
    socketService.onRoomJoined((data: any) => {
      setRoom(data.room);
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setIsReconnecting(false);
      setWasKicked(false);
      setError("");
      setLoadingAction(null);

      // Persist for refresh
      localStorage.setItem("roomCode", data.roomCode);
      localStorage.setItem("playerId", data.playerId);
    });

    // 2. Listen for general room updates
    socketService.onRoomUpdated((updatedRoom: Room) => {
      // Use localStorage as a backup if state is empty during refresh
      const myId = localStorage.getItem("playerId");
      const amIInList = updatedRoom.players.some(p => p.id === myId);

      if (myId && !amIInList) {
        handleForceExit("You have been removed from the room.");
        setRoom(null);
        return;
      }
      setRoom(updatedRoom);
    });

    socketService.onError((msg) => {
      setError(msg);
      setIsReconnecting(false);
      setLoadingAction(null);
      // If error is "Room not found", clear storage
      if (msg.toLowerCase().includes("not found")) {
        localStorage.removeItem("roomCode");
        localStorage.removeItem("playerId");
        alert(msg || "An error occurred.");
      }
    });

    socketService.socket.on("kicked", () => {
      handleForceExit("You have been kicked by the Game Master.");
      localStorage.removeItem("roomCode");
      localStorage.removeItem("playerId");
    });

    // 3. Trigger Reconnect if data exists
    const savedRoom = localStorage.getItem("roomCode");
    const savedPlayer = localStorage.getItem("playerId");

    if (savedRoom && savedPlayer) {
      socketService.reconnect(savedRoom, savedPlayer);

      // Safety timeout: If server doesn't respond in 5s, let user go to lobby
      const timeout = setTimeout(() => setIsReconnecting(false), 5000);
      return () => clearTimeout(timeout);
    } else {
      setIsReconnecting(false);
    }

    // 4. Cleanup on Unmount
    return () => {
      socketService.offAll(); // Use the offAll helper we made in socket.ts
    };
  }, []); // Empty array ensures this only runs ONCE on load

  useEffect(() => {
    const handleInternetChange = () => {
      setNetConnection(navigator.onLine ? "ok" : "down");
    };

    handleInternetChange();

    window.addEventListener("online", handleInternetChange);
    window.addEventListener("offline", handleInternetChange);

    return () => {
      window.removeEventListener("online", handleInternetChange);
      window.removeEventListener("offline", handleInternetChange);
    };
  }, [isConnectedToSocket]);

  useEffect(() => {
    if (room && !room.gameStarted) {
      setIsRevealed(false);
    }
  }, [room?.gameStarted]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isRevealed) {
      timer = setTimeout(() => {
        setIsRevealed(false);
      }, 8000); // 5 seconds
    }
    return () => clearTimeout(timer); // Cleanup if user clicks again or unmounts
  }, [isRevealed]);

  useEffect(() => {
    if (!room || !playerId) return;

    const general = room.players.find(p => p.isGeneral);

    if (!general) {
      setCurrentGeneral(null);
      return;
    }

    if (general && general.id !== currentGeneral?.id) {
      setCurrentGeneral(general);

    }
  }, [room?.players]);

  useEffect(() => {
    socketService.onRoomDissolved(() => {
      // Clear local storage so they don't auto-reconnect to a dead room
      localStorage.removeItem("roomCode");
      localStorage.removeItem("playerId");

      setTimeout(() => {
        // window.location.href = "/"; // Force a hard redirect to the home page
        window.location.reload();

      }, 500);

      // Force page reload or redirect to home
      // window.location.reload();
    });

    return () => socketService.offRoomDissolved();
  }, []);

  const me = room?.players.find(p => p.id === playerId);
  const isGameMaster = me?.isGameMaster === true;

  const handleForceExit = (reason: string) => {
    setRoom(null);
    setRoomCode("");
    setPlayerId(null);
    setWasKicked(true);
    setError(reason);
    localStorage.removeItem("roomCode");
    localStorage.removeItem("playerId");
  };

  const createRoom = () => {
    setLoadingAction("create");
    setWasKicked(false);
    socketService.createRoom(name);
    setTimeout(() => setLoadingAction(null), 5000);
  };
  const joinRoom = () => {
    setLoadingAction("join");
    setWasKicked(false);
    socketService.joinRoom(roomCode, name);
    setTimeout(() => setLoadingAction(null), 5000);
  };

  const kickPlayer = (targetId: string) => { socketService.kickPlayer(roomCode, targetId, playerId!); };
  const toggleLock = () => { if (!room || !playerId || room.gameStarted) return; socketService.lockRoom(roomCode, !room?.locked, playerId); };
  const handleStartGame = () => { if (!room || !playerId) return; setIsRevealed(false); socketService.startGame(roomCode, playerId); };
  const handleResetGame = () => { if (!room || !playerId) return; if (window.confirm("Reset the game?")) socketService.resetGame(roomCode, playerId); setIsRevealed(false) };
  const handleAssignGeneral = () => { if (!room || !playerId) return; socketService.assignGeneral(roomCode, playerId); };

  const handleStartVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.startVote(roomCode, playerId); };
  const handleClearVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.clearVote(roomCode, playerId); };
  const handleYesVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.castVote(roomCode, playerId, "yes"); };
  const handleNoVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.castVote(roomCode, playerId, "no"); };
  const handleCloseRoom = () => { if (!room || !playerId || !room.gameStarted) return; socketService.closeRoom(roomCode, playerId); };

  const handleSetTeam = (playerIds: string[]) => { if (!room || !playerId || !room.gameStarted) return; socketService.proposeTeam(roomCode, playerIds); };
  const handleStartSecretVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.startSecretVote(roomCode, playerId); };

  const leaveRoom = () => {
    const currentRoomCode = roomCode || localStorage.getItem("roomCode");
    const myId = playerId || localStorage.getItem("playerId");
    if (currentRoomCode && myId) socketService.leaveRoom(currentRoomCode, myId);
    setRoom(null); setRoomCode(""); setPlayerId(null); setWasKicked(false); setError("");
    localStorage.removeItem("roomCode"); localStorage.removeItem("playerId");
  };

  const handleCopy = async (type: "code" | "link") => {
    const textToCopy = type === "code"
      ? roomCode
      : `${window.location.origin}?room=${roomCode}`;

    // 1. Primary Method: Modern Clipboard API
    // We check if it's a Secure Context (localhost or HTTPS)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedStatus(type);
        setTimeout(() => setCopiedStatus(null), 2000);
        return; // Success!
      } catch (err) {
        console.error("Modern copy failed, switching to fallback", err);
      }
    }
    try {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;

      // Keep it hidden but part of the DOM
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopiedStatus(type);
        setTimeout(() => setCopiedStatus(null), 2000);
      } else {
        throw new Error("ExecCommand returned false");
      }
    } catch (err) {
      console.error("Fallback copy failed", err);
      alert(`Could not auto-copy. Please copy manually: ${textToCopy}`);
    }
  };

  const handleDissolve = () => {
    if (window.confirm("Terminate this session for all players?")) {
      handleCloseRoom();

      // GM also needs immediate local cleanup
      localStorage.removeItem("roomCode");
      localStorage.removeItem("playerId");
      window.location.href = "/";
    }
  };

  const handleTogglePlayer = (id: string) => {
    if (!room || !playerId || !room.gameStarted) return;
    // 1. Calculate the new team locally
    const currentTeam = room.proposedTeam || [];
    const isSelected = currentTeam.includes(id);

    const newTeam = isSelected
      ? currentTeam.filter(pId => pId !== id)
      : [...currentTeam, id];

    handleSetTeam(newTeam);
  };

  // --- Styles ---
  const containerStyle: React.CSSProperties = {
    padding: "20px",
    maxWidth: "500px",
    margin: "0 auto",
    fontFamily: "'EB Garamond', serif",
    color: "#e0e0e0",
    backgroundColor: "#0f0f0f",
    minHeight: "100vh",
    lineHeight: "1.5"
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    marginBottom: "20px",
    border: "1px solid #333"
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    // marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #444",
    backgroundColor: "#2d2d2d",
    color: "#fff",
    fontSize: "16px",
    boxSizing: "border-box"
  };

  const primaryBtn: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    backgroundColor: "#6c5ce7",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "10px"
  };

  if (isReconnecting) {
    return (
      <GameLoader message={"Re-establishing Intelligence Links..."} />
    );
  }


  // --- UI Components ---
  return (
    <div style={containerStyle}>

      <header style={{
        textAlign: "center",
        padding: "20px",
        background: "linear-gradient(to bottom, #1a1a1a, transparent)",
        borderRadius: "0 0 20px 20px"
      }}>
        <h1 style={{ margin: 0, fontSize: "16px", color: "#c5a059", letterSpacing: "2px", textTransform: 'uppercase' }}>
          The Battle of
        </h1>
        <h1 style={{ margin: 0, fontSize: "32px", color: "#c5a059", letterSpacing: "2px", textTransform: 'uppercase' }}>
          Polashi (পলাশী)
        </h1>
        <div style={{
          display: 'inline-flex',
          gap: '15px',
          fontSize: "11px",
          marginTop: "12px",
          color: "#888",
          padding: "4px 12px",
          backgroundColor: "#222",
          borderRadius: "20px",
          border: "1px solid #333"
        }}>
          <span>Internet: {newConnection === "ok" ? "🟢" : "🔴"}</span>
          <span>Server: {isConnectedToSocket ? "🟢" : "🔴"}</span>
        </div>
      </header>

      {error && !wasKicked &&
        error.includes("locked") && (
          <div style={{
            ...cardStyle,
            border: "2px solid #ff922b",
            textAlign: "center",
            animation: "shake 0.5s ease-in-out"
          }}>
            <h3 style={{ color: "#ff922b" }}>🏰 Fortress Fortified</h3>
            <p style={{ color: "#aaa" }}>This campaign has already begun or the gates have been barred by the Master.</p>
          </div>
        )
      }


      {/* KICKED MESSAGE */}
      {wasKicked && !room && (
        <div style={{
          ...cardStyle,
          border: "2px solid #ff7675",
          background: "linear-gradient(135deg, #1a1a1a 0%, #2d1a1a 100%)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "50px", marginBottom: "10px" }}>⚠️</div>
          <h2 style={{ color: "#ff7675", textTransform: 'uppercase', letterSpacing: '2px' }}>Access Revoked</h2>
          <p style={{ color: "#ccc", fontStyle: 'italic', marginBottom: '25px' }}>
            "{error || "You have been disconnected from the command center."}"
          </p>
          <button
            style={{ ...primaryBtn, backgroundColor: "#ff7675", color: "#000" }}
            onClick={() => { setWasKicked(false); setError(""); }}
          >
            Return to Shadows
          </button>
        </div>
      )}

      {/* LOGIN VIEW */}
      {!room && !wasKicked && (
        <div style={{
          ...cardStyle,
          border: "2px solid #c5a059",
          position: 'relative',
          padding: '30px',
          marginTop: '10px',
          animation: 'slideUpFade 0.8s ease-out forwards'
        }}>
          {/* Decorative Label */}
          <div style={{
            position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#0f0f0f', padding: '0 15px', color: '#c5a059',
            fontSize: '12px', letterSpacing: '3px', fontWeight: 'bold'
          }}>
            ENLISTMENT
          </div>

          {/* STEP 1: IDENTITY */}
          <div style={{ marginBottom: '35px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: "#fff", fontSize: '22px', marginBottom: '15px', fontFamily: "'Cinzel', serif" }}>
              Step 1: Identify Yourself
            </h3>
            <input
              placeholder="Enter Alias..."
              style={{
                ...inputStyle,
                width: '100%',
                boxSizing: 'border-box',
                border: name ? '1px solid #c5a059' : '1px solid #333',
                animation: !name ? 'goldPulse 2s infinite' : 'none'
              }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* VISUAL DIVIDER */}
          <div style={{
            height: '1px',
            background: 'linear-gradient(to right, transparent, #c5a059, transparent)',
            margin: '20px auto',
            width: '80%'
          }} />

          {/* STEP 2: CHOOSE PATH */}
          <div style={{ opacity: name ? 1 : 0.5, transition: 'opacity 0.5s ease' }}>
            <h3 style={{ color: "#fff", textAlign: 'center', fontSize: '18px', marginBottom: '20px', fontFamily: "'Cinzel', serif" }}>
              Step 2: Choose Mission
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

              {/* PATH A: CREATE */}
              <div style={{ textAlign: 'center' }}>
                <button
                  style={{
                    ...primaryBtn,
                    backgroundColor: name && !roomCode && loadingAction !== "create" ? "#c5a059" : "#222",
                    color: name && !roomCode && loadingAction !== "create" ? "#000" : "#555",
                    width: '100%',
                    cursor: (name && !roomCode && !loadingAction) ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                  onClick={createRoom}
                  disabled={!name || !!loadingAction || !!roomCode}
                >
                  Establish New HQ
                  {loadingAction === "create" && <div className="btn-spinner" />}
                </button>
              </div>

              <div style={{ position: 'relative', textAlign: 'center' }}>
                <span style={{ backgroundColor: '#0f0f0f', padding: '0 10px', color: 'white', fontSize: '16px', position: 'relative', zIndex: 1 }}>OR JOIN</span>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'white', zIndex: 0 }} />
              </div>

              {/* PATH B: JOIN */}
              <div style={{
                backgroundColor: 'rgba(197, 160, 89, 0.03)',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid rgba(197, 160, 89, 0.1)'
              }}>
                <input
                  placeholder="Enter HQ Code"
                  disabled={!!loadingAction}
                  style={{
                    ...inputStyle,
                    textAlign: 'center',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    marginBottom: '15px',
                    backgroundColor: '#000',
                    border: roomCode ? '1px solid #c5a059' : '1px solid #222',
                    opacity: loadingAction ? 0.5 : 1
                  }}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                />
                <button
                  style={{
                    ...primaryBtn,
                    backgroundColor: "transparent",
                    border: `1px solid ${(name && roomCode && !loadingAction) ? "#c5a059" : "#333"}`,
                    color: (name && roomCode && loadingAction !== "join") ? "#c5a059" : "#444",
                    width: '100%',
                    cursor: (name && roomCode && !loadingAction) ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                  onClick={joinRoom}
                  disabled={!name || !roomCode || !!loadingAction}
                >
                  Infiltrate Existing HQ
                  {loadingAction === "join" && <div className="btn-spinner" />}
                </button>
              </div>
            </div>
          </div>
          <style>

            {
              `
  @keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes goldPulse {
  0% { box-shadow: 0 0 0px rgba(197, 160, 89, 0.2); }
  50% { box-shadow: 0 0 15px rgba(197, 160, 89, 0.4); }
  100% { box-shadow: 0 0 0px rgba(197, 160, 89, 0.2); }
}

@keyframes borderDraw {
  from { width: 0%; }
  to { width: 100%; }
}

.btn-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(197, 160, 89, 0.3);
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: btn-spin 0.8s linear infinite;
    }
    @keyframes btn-spin {
      to { transform: rotate(360deg); }
    }

  `
            }
          </style>
        </div>
      )}

      {/* GAME VIEW */}
      {room && (
        <>
          <div style={{
            marginBottom: '20px',
            border: '1px solid rgba(197, 160, 89, 0.3)',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: "'Cinzel', serif"
          }}>
            {/* CLICKABLE HEADER */}
            <div
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'linear-gradient(90deg, rgba(197, 160, 89, 0.1) 0%, rgba(0,0,0,0) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#40c057',
                  boxShadow: '0 0 10px #40c057',
                }} />
                <div>
                  <span style={{ fontSize: '10px', color: '#c5a059', display: 'block', letterSpacing: '2px' }}>OPERATIVE</span>
                  <span style={{ fontSize: '16px', color: '#fff', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {room.players.find(p => p.id === playerId)?.name || "Unknown"}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {/* Shimmering Badge indicating status */}
                <span style={{ fontSize: '10px', color: room.locked ? '#ff922b' : '#00b894' }}>
                  {room.locked ? "🔒 LOCKED" : "🔓 OPEN"}
                </span>
                <span style={{
                  color: '#c5a059',
                  transform: isDrawerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.4s'
                }}>
                  ▼
                </span>
              </div>
            </div>

            {/* EXPANDABLE CONTENT */}
            <div style={{
              maxHeight: isDrawerOpen ? '300px' : '0px',
              opacity: isDrawerOpen ? 1 : 0,
              transition: 'all 0.4s ease-in-out',
              padding: isDrawerOpen ? '20px' : '0 20px',
              borderTop: isDrawerOpen ? '1px solid rgba(197, 160, 89, 0.2)' : 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.6)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* ACCESS MODULE */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '9px', color: '#666', letterSpacing: '1px' }}>SESSION CIPHER</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#c5a059', fontSize: '22px', fontWeight: 'bold', letterSpacing: '4px' }}>
                        {roomCode}
                      </span>
                      <button
                        onClick={() => handleCopy("code")}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#fff' }}
                        title="Copy Cipher"
                      >
                        {copiedStatus === "code" ? "✅" : "📋"}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy("link")}
                    style={{
                      backgroundColor: copiedStatus === "link" ? '#c5a059' : 'transparent',
                      border: '1px solid #c5a059',
                      color: copiedStatus === "link" ? '#000' : '#c5a059',
                      padding: '10px 15px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedStatus === "link" ? "LINK COPIED" : "INVITE ALLIES"}
                  </button>
                </div>

                {/* UTILITY ROW */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'end',
                  alignItems: 'center',
                  paddingTop: '15px',
                  borderTop: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <button
                    onClick={leaveRoom}
                    style={{
                      background: 'none',
                      border: '1px solid #444',
                      color: '#888',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ff7675'; e.currentTarget.style.borderColor = '#ff7675'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = '#444'; }}
                  >
                    Abandon Post
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECRET IDENTITY CARD */}
          {room.gameStarted && me?.character && (
            <div
              onClick={() => setIsRevealed(!isRevealed)}
              style={{
                perspective: "1000px",
                margin: "25px 0",
                cursor: "pointer",
                height: "400px", // Fixed height for smooth flipping
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

                {/* --- FRONT OF CARD (The Mystery Side - High Customization) --- */}
                <div style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  backfaceVisibility: "hidden",
                  backgroundColor: "#1a1a1a", // Deep charcoal
                  borderRadius: "20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "8px solid #c5a059", // Gold/Brass border
                  boxShadow: "0 15px 35px rgba(0,0,0,0.5), inset 0 0 50px rgba(0,0,0,0.8)",
                  overflow: "hidden"
                }}>
                  {/* Decorative Corner Ornaments */}
                  {[{ top: 10, left: 10 }, { top: 10, right: 10 }, { bottom: 10, left: 10 }, { bottom: 10, right: 10 }].map((pos, i) => (
                    <div key={i} style={{
                      position: "absolute",
                      width: "30px",
                      height: "30px",
                      border: "2px solid #c5a059",
                      opacity: 0.5,
                      ...pos,
                      transform: i === 1 ? 'rotate(90deg)' : i === 2 ? 'rotate(-90deg)' : i === 3 ? 'rotate(180deg)' : 'none'
                    }} />
                  ))}

                  {/* Center Emblem Logic */}
                  <div style={{
                    width: "140px",
                    height: "140px",
                    border: "2px double #c5a059",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "radial-gradient(circle, #2d3436 0%, #1a1a1a 100%)",
                    boxShadow: "0 0 20px rgba(197, 160, 89, 0.2)"
                  }}>
                    <div style={{
                      fontSize: "50px",
                      filter: "drop-shadow(0 0 10px rgba(197, 160, 89, 0.5))",
                      animation: "floating 3s infinite ease-in-out"
                    }}>
                      📜
                    </div>
                  </div>

                  <div style={{ marginTop: "20px", textAlign: "center", zIndex: 2 }}>
                    <h2 style={{
                      color: "#c5a059",
                      margin: 0,
                      letterSpacing: "4px",
                      textTransform: "uppercase",
                      fontSize: "18px"
                    }}>
                      Classified
                    </h2>
                    <div style={{
                      width: "60px",
                      height: "2px",
                      backgroundColor: "#c5a059",
                      margin: "10px auto",
                      opacity: 0.6
                    }} />
                    <p style={{ color: "#888", fontSize: "12px", fontStyle: "italic" }}>
                      Tap to reveal your destiny
                    </p>
                  </div>

                  {/* Subtle Pattern Overlay */}
                  <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    opacity: 0.05,
                    backgroundImage: `url("https://www.transparenttextures.com/patterns/dark-matter.png")`,
                    pointerEvents: "none"
                  }} />
                </div>

                {/* --- BACK OF CARD (The Identity Side) --- */}
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    backgroundColor: "rgb(197, 160, 89)", // Your Brass/Gold base
                    borderRadius: "20px",
                    transform: "rotateY(180deg)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                    boxSizing: "border-box",
                    border: `3px solid ${me.character.team === "Nawabs" ? "#1b4332" : "#7b1113"}`,
                    boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
                    overflow: 'hidden'
                  }}
                >
                  {/* Shimmer Effect */}
                  <div className="shimmer-effect" />

                  {/* Team Icon */}
                  <div style={{
                    width: "80px", height: "80px", borderRadius: "50%",
                    background: "rgba(0,0,0,0.1)", display: "flex",
                    alignItems: "center", justifyContent: "center", marginBottom: "10px"
                  }}>
                    <img
                      src={me.character.team === "Nawabs" ? "/Nawab.png" : "/EIC.png"}
                      style={{ width: "90px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }}
                    />
                  </div>

                  {/* Character Identity */}
                  <h1 style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "black",
                    margin: "0 0 2px 0",
                    textAlign: 'center'
                  }}>
                    {me.character.name}
                  </h1>

                  <div style={{
                    padding: "2px 12px",
                    background: "rgba(0,0,0,0.8)",
                    borderRadius: "4px",
                    fontSize: "11px",
                    color: "#c5a059",
                    marginBottom: "12px",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: '1px'
                  }}>
                    {me.character.team.toUpperCase()}
                  </div>

                  {/* Character Bio */}
                  <p style={{
                    fontFamily: "'EB Garamond', serif",
                    fontSize: "16px",
                    fontStyle: "italic",
                    lineHeight: "1.3",
                    color: "rgba(0,0,0,0.8)",
                    fontWeight: 600,
                    textAlign: "center",
                    margin: "0 0 15px 0"
                  }}>
                    "{me.character.description}"
                  </p>

                  {/* --- SECRET INTELLIGENCE BOX --- */}
                  {room.secretIntel && room.secretIntel.length > 0 && (
                    <div style={{
                      width: "100%",
                      backgroundColor: "rgba(0,0,0,0.15)", // Subtle dark tint on the brass
                      borderRadius: "10px",
                      padding: "12px",
                      border: "1px dashed rgba(0,0,0,0.3)",
                      boxSizing: "border-box"
                    }}>
                      <p style={{
                        margin: "0 0 8px 0",
                        fontSize: "14px",
                        color: "black",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        fontWeight: "bold",
                        fontFamily: "'Cinzel', serif",
                        textAlign: "center",
                        borderBottom: "1px solid rgba(0,0,0,0.1)",
                        paddingBottom: "4px"
                      }}>
                        Secret Intelligence
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {room.secretIntel.map((intel, idx) => (
                          <div key={idx} style={{
                            fontSize: "16px",
                            color: "black",
                            fontFamily: "'EB Garamond', serif",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}>
                            {intel}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                  {/* --- AUTO-HIDE TIMER BAR --- */}
                  {isRevealed && (
                    <div style={{
                      position: "absolute",
                      bottom: "0",
                      left: "0",
                      height: "6px",
                      backgroundColor: "rgba(0,0,0,0.3)",
                      width: "100%"
                    }}>
                      <div style={{
                        height: "100%",
                        backgroundColor: me.character.team === "Nawabs" ? "#1b4332" : "#7b1113",
                        animation: "burnTimer 8s linear forwards"
                      }} />
                    </div>
                  )}

                </div>

              </div>

              {/* CSS ANIMATIONS */}
              <style>{`

              @keyframes burnTimer {
        from { width: 100%; }
        to { width: 0%; }
      }
      @keyframes pulseBorder {
        0% { transform: scale(1); opacity: 0.2; }
        50% { transform: scale(1.05); opacity: 0.5; }
        100% { transform: scale(1); opacity: 0.2; }
      }
      .shimmer-effect {
        position: absolute;
        top: 0; left: -150%; width: 100%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        transform: skewX(-20deg);
        animation: shimmer 3s infinite linear;
      }
      @keyframes shimmer {
        0% { left: -150%; }
        100% { left: 150%; }
      }
    `}</style>
            </div>
          )}

          {/* ASSIGN GENERAL BUTTON */}
          {me?.isGameMaster && room?.gameStarted && (
            <div style={{ textAlign: "center", marginBottom: "30px" }}>

              <p style={{ color: "white", fontSize: "20px" }}>Ready to assign General?</p>

              <button
                onClick={handleAssignGeneral}
                style={{
                  ...primaryBtn,
                  backgroundColor: "#c5a059",
                  color: "#000",
                  height: "60px",
                  fontSize: "18px",
                  boxShadow: "0 0 20px rgba(197, 160, 89, 0.3)",
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                Appoint General
              </button>

            </div>
          )}

          {/* SELECT PROPOSED TEAM  */}
          {me?.isGeneral && room.gameStarted && !room.voting?.active && (
            <div style={{
              margin: "20px 0",
              padding: "20px",
              background: "rgba(197, 160, 89, 0.05)",
              border: "1px solid #c5a059",
              borderRadius: "12px",
              fontFamily: "'Cinzel', serif"
            }}>
              <h3 style={{ color: "#c5a059", marginTop: 0 }}>Assemble Your Battalion</h3>
              <p style={{ color: "#888", fontSize: "12px", fontFamily: "'EB Garamond', serif" }}>
                Select the operatives you trust for this mission.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                {room.players.map(p => {
                  const isSelected = (room.proposedTeam || []).includes(p.id);

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleTogglePlayer(p.id)}
                      style={{
                        padding: "10px 14px",
                        backgroundColor: isSelected ? "#c5a059" : "rgba(255,255,255,0.02)",
                        color: isSelected ? "#000" : "#c5a059",
                        border: `1px solid ${isSelected ? "#c5a059" : "rgba(197, 160, 89, 0.4)"}`,
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: isSelected ? "bold" : "normal",
                        transition: "all 0.1s ease-out", // Snappy transition
                        flex: "1 1 calc(33% - 10px)", // Fits 3 in a row on mobile
                        minWidth: "90px"
                      }}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: "11px", color: "#666" }}>
                {room.proposedTeam?.length || 0} Operatives Selected
              </div>
            </div>
          )}

          {/* PLAYER COUNT  */}
          {
            room.players.length > 0 && (
              <div style={{
                marginBottom: "15px",
                fontSize: "16px",
                color: "#aaa",
                textAlign: "center",
                textTransform: "uppercase",
                letterSpacing: "1.5px"
              }}>
                Players Joined: <span style={{ color: "white", fontWeight: "bold" }}>{room.players.length}/10</span>
              </div>
            )
          }

          {/* PLAYER LIST */}
          {room.players.map((p) => (
            <div key={p.id} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              backgroundColor: p.id === playerId ? "#2d2d2d" : "#222",
              borderRadius: "10px",
              marginBottom: "8px",
              borderLeft: p.id === playerId ? "4px solid #6c5ce7" : "4px solid transparent",
              opacity: p.online ? 1 : 0.4,
              transition: "all 0.3s ease"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: p.online ? "#00b894" : "#ff7675",
                  boxShadow: p.online ? "0 0 10px #00b894" : "none"
                }} />
                <span style={{
                  color: p.id === playerId ? "#fff" : "#ccc",
                  fontWeight: p.id === playerId ? "bold" : "normal"
                }}>
                  {p.name} {p.isGameMaster && "👑"}
                </span>
              </div>
              {isGameMaster && !room.gameStarted && p.id !== playerId && (
                <button onClick={() => kickPlayer(p.id)} style={{ border: "none", background: "none", color: "#ff7675", cursor: "pointer", fontSize: "12px" }}>REMOVE</button>
              )}
              {p.isGeneral && (
                <span style={{
                  marginLeft: "8px",
                  fontSize: "12px",
                  color: "#c5a059",
                  border: "1px solid #c5a059",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  textTransform: "uppercase"
                }}>
                  General
                </span>
              )}
            </div>
          ))}

          {/* GAME ACTIONS */}
          {isGameMaster && !room.gameStarted && (
            <div style={{ textAlign: "center", marginBottom: "30px" }}>

              <p style={{ color: "white", fontSize: "20px" }}>Ready to assign secret roles?</p>

              <button
                onClick={handleStartGame}
                style={{
                  ...primaryBtn,
                  backgroundColor: "#c5a059", // Brass/Gold
                  color: "#000",
                  height: "60px",
                  fontSize: "18px",
                  boxShadow: "0 0 20px rgba(197, 160, 89, 0.3)",
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                {room.players.length < 2 ? "Waiting for Recruits..." : "Begin Campaign"}
              </button>

            </div>
          )}

          {/* ADMIN PANEL */}
          {isGameMaster && (
            <div style={{
              marginTop: 40,
              padding: "24px",
              backgroundColor: room.locked ? "#1a1610" : "#111814",
              borderRadius: "16px",
              border: `1px solid ${room.locked ? "#5f411e" : "#2d4a34"}`,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: 0, right: 0, width: "100px", height: "4px",
                backgroundColor: room.locked ? "#ff922b" : "#40c057",
                boxShadow: `0 0 15px ${room.locked ? "#ff922b" : "#40c057"}`
              }} />

              <h4 style={{
                margin: "0 0 20px 0",
                color: "#c5a059",
                fontSize: "0.9rem",
                textTransform: "uppercase",
                letterSpacing: "2px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <span style={{ fontSize: "18px" }}>🛡️</span> Command Console
              </h4>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {/* LOCK BUTTON */}
                <button
                  onClick={toggleLock}
                  style={{
                    flex: 1, minWidth: "140px", padding: "14px",
                    backgroundColor: room.locked ? "rgba(255, 146, 43, 0.1)" : "rgba(64, 192, 87, 0.1)",
                    color: room.locked ? "#ff922b" : "#40c057",
                    border: `1px solid ${room.locked ? "#ff922b" : "#40c057"}`,
                    borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", textTransform: "uppercase"
                  }}
                >
                  {room.locked ? "🔓 Unlock Entry" : "🔒 Secure Room"}
                </button>

                {/* VOTE BUTTON (New Feature) */}
                {room.gameStarted && playerId && (
                  <button
                    onClick={handleStartVote}
                    style={{
                      flex: 1, minWidth: "140px", padding: "14px",
                      backgroundColor: "rgba(197, 160, 89, 0.1)",
                      color: "#c5a059",
                      border: "1px solid #c5a059",
                      borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", textTransform: "uppercase"
                    }}
                  >
                    {room.voting ? "🔄 New Vote" : "📜 Take Vote"}
                  </button>
                )}

                {/* RESET BUTTON */}
                {room.gameStarted && (
                  <button
                    onClick={handleResetGame}
                    style={{
                      flex: 1, minWidth: "140px", padding: "14px",
                      backgroundColor: "transparent", color: "#888", border: "1px solid #444",
                      borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", textTransform: "uppercase"
                    }}
                  >
                    🔄 Reset Campaign
                  </button>
                )}

                <button
                  onClick={handleDissolve}
                  style={{
                    flex: 1,
                    minWidth: "140px",
                    padding: "14px",
                    backgroundColor: "rgba(255, 71, 71, 0.1)",
                    color: "#ff4747",
                    border: "1px solid #ff4747",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#ff4747";
                    e.currentTarget.style.color = "#000";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 71, 71, 0.1)";
                    e.currentTarget.style.color = "#ff4747";
                  }}
                >
                  💥 Close HQ
                </button>
              </div>
            </div>
          )}

          {/* GENERAL REVEAL OVERLAY */}
          {generalReveal?.active && (
            <div
              onClick={() => setGeneralReveal(null)}
              style={{
                position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                backgroundColor: "rgba(0,0,0,0.96)", zIndex: 20000,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer"
              }}
            >
              {generalReveal.flipping ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <div className="gold-mohur">👑</div>
                  <p style={{
                    color: "#c5a059", marginTop: "30px",
                    fontFamily: "'Cinzel', serif", letterSpacing: "3px",
                    animation: "pulseText 1.5s infinite"
                  }}>
                    CONSULTING THE COMMANDERS...
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: "center", animation: "revealPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
                  <div style={{ fontSize: "60px", marginBottom: "10px" }}>🎖️</div>
                  <h2 style={{ fontFamily: "'Cinzel', serif", color: "#c5a059", margin: 0, letterSpacing: "2px" }}>
                    GENERAL ASSIGNED
                  </h2>
                  <h1 style={{
                    fontFamily: "'Cinzel', serif", color: "white", fontSize: "48px",
                    margin: "10px 0", textShadow: "0 0 20px rgba(197, 160, 89, 0.6)"
                  }}>
                    {generalReveal.name}
                  </h1>
                  <p style={{ fontFamily: "'EB Garamond', serif", color: "#aaa", fontStyle: "italic", fontSize: "18px" }}>
                    "The fate of Bengal rests upon your blade."
                  </p>
                </div>
              )}

              <style>{`
      .gold-mohur {
        width: 100px; height: 100px;
        background: radial-gradient(circle, #ffe08a 0%, #c5a059 100%);
        border: 5px solid #8e6d2a; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 50px; box-shadow: 0 0 30px rgba(197, 160, 89, 0.5);
        animation: fastSpinY 0.4s linear infinite;
      }

      @keyframes fastSpinY {
        from { transform: rotateY(0deg); }
        to { transform: rotateY(360deg); }
      }

      @keyframes revealPop {
        0% { opacity: 0; transform: scale(0.5); }
        100% { opacity: 1; transform: scale(1); }
      }

      @keyframes pulseText {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `}</style>
            </div>
          )}

          {/* --- VOTING SYSTEM MODAL --- */}
          {room?.voting && (
            <div style={{
              position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.92)", backdropFilter: "blur(8px)",
              zIndex: 20001, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center"
            }}>
              {/* Decorative Header */}
              <div style={{ marginBottom: "30px" }}>
                <div style={{ color: "#c5a059", fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", marginBottom: "8px" }}>
                  {room.voting.type === "teamApproval" ? "Royal Court" : "Battlefield"}
                </div>
                <h2 style={{
                  color: "#fff", fontFamily: "'Cinzel', serif", fontSize: "32px", margin: 0,
                  textShadow: "0 0 15px rgba(197, 160, 89, 0.3)"
                }}>
                  {room.voting.active
                    ? room.voting.type === "teamApproval" ? "Council Deliberation" : "Cast Secret Vote"
                    : "The Final Verdict"}
                </h2>
                <div style={{ width: "100px", height: "1px", background: "linear-gradient(to right, transparent, #c5a059, transparent)", margin: "15px auto" }} />
              </div>

              {/* TEAM LIST DISPLAY */}
              <div style={{ margin: "20px 0" }}>
                <p style={{ color: "#666", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase" }}>
                  Proposed Battalion:
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                  {room.proposedTeam?.map(tid => {
                    const player = room.players.find(p => p.id === tid);
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

              {playerId && room.voting.active ? (
                <>
                  {/* ACTIVE VOTING PHASE */}
                  {/* Logic: If it's team approval, everyone votes. If secret vote, only proposed team votes. */}
                  {(room.voting.type === "teamApproval" || room.proposedTeam?.includes(playerId)) ? (
                    <>
                      <p style={{ color: "#888", fontFamily: "'EB Garamond', serif", fontSize: "18px", fontStyle: "italic", marginBottom: "30px" }}>
                        {room.voting.type === "teamApproval"
                          ? "The assembly awaits your decision. Choose wisely."
                          : "The fate of the mission rests in your hands. Act in secret."}
                      </p>

                      <div style={{
                        backgroundColor: "rgba(255,255,255,0.03)", padding: "15px 30px", borderRadius: "50px",
                        border: "1px solid rgba(197, 160, 89, 0.2)", color: "#c5a059", fontSize: "14px",
                        marginBottom: "40px", display: 'inline-block'
                      }}>
                        Progress: <span style={{ color: "#fff", fontWeight: "bold" }}>{Object.keys(room.voting.votes).length}</span> / {room.voting.type === "teamApproval" ? room.players.length : room?.proposedTeam?.length}
                      </div>

                      {playerId && !room.voting.votes[playerId] ? (
                        <div style={{ display: "flex", gap: "40px", justifyContent: "center" }}>
                          {/* YES / SUCCESS OPTION */}
                          <div style={{ textAlign: 'center' }}>
                            <button onClick={handleYesVote} className="vote-btn">
                              <img src={room.voting.type === "teamApproval" ? "/green_seal.png" : "/green_card.png"}
                                alt="Yes" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
                            </button>
                            <p style={{ fontFamily: "Cinzel", color: "#40c057", marginTop: '10px', fontSize: '14px' }}>
                              {room.voting.type === "teamApproval" ? "APPROVE" : "SUCCESS"}
                            </p>
                          </div>

                          {/* NO / SABOTAGE OPTION */}
                          <div style={{ textAlign: 'center' }}>
                            <button onClick={handleNoVote} className="vote-btn">
                              <img src={room.voting.type === "teamApproval" ? "/red_seal.png" : "/red_card.png"}
                                alt="No" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
                            </button>
                            <p style={{ fontFamily: "Cinzel", color: "#ff7675", marginTop: '10px', fontSize: '14px' }}>
                              {room.voting.type === "teamApproval" ? "REJECT" : "SABOTAGE"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ animation: "pulseOpacity 2s infinite" }}>
                          <p style={{ color: "#c5a059", fontSize: "20px", fontFamily: "Cinzel" }}>Decision Recorded</p>
                          <p style={{ color: "#666", fontSize: "14px" }}>Awaiting remaining members...</p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* SPECTATOR VIEW FOR THOSE NOT IN THE BATTALION */
                    <div style={{ padding: "40px", animation: "pulseOpacity 3s infinite" }}>
                      <p style={{ color: "#c5a059", fontSize: "22px", fontFamily: "Cinzel", letterSpacing: "2px" }}>
                        Mission in Progress...
                      </p>
                      <p style={{ color: "#666", fontSize: "16px", fontStyle: "italic" }}>
                        The battalion is operating behind enemy lines. Await the outcome.
                      </p>
                    </div>
                  )}

                  {isGameMaster && (
                    <div style={{ marginTop: "40px" }}>
                      <button onClick={handleClearVote} className="cancel-btn">🚫 Cancel Voting Session</button>
                    </div>
                  )}
                </>
              ) : (
                /* RESULT PHASE */
                <div style={{ animation: "revealVerdict 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards" }}>
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: '40px', perspective: '1000px' }}>
                    <div className="flipping-container">
                      <img
                        src={room.voting.result === "Yes"
                          ? (room.voting.type === "teamApproval" ? "/green_seal.png" : "/green_card.png")
                          : (room.voting.type === "teamApproval" ? "/red_seal.png" : "/red_card.png")}
                        className="result-image-3d"
                        style={room.voting.type === "teamApproval" ? { height: `height: 130px;` } : { width: `160px` }}
                      />
                    </div>

                    <div className="verdict-text" style={{ color: room.voting.result === "Yes" ? "#40c057" : "#ff7675" }}>
                      {room.voting.type === "teamApproval"
                        ? (room.voting.result === "Yes" ? "APPROVED" : "REJECTED")
                        : (room.voting.result === "Yes" ? "MISSION SUCCESS" : "MISSION FAILED")}
                    </div>
                    <div className="shadow-fx" />
                  </div>

                  {/* Tally Breakdown */}
                  <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "30px", fontFamily: "Cinzel", fontSize: "18px" }}>
                    <div style={{ color: "#40c057", display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={room.voting.type === "teamApproval" ? "/green_seal.png" : "/green_card.png"} style={{ width: '25px' }} />
                      {Object.values(room.voting.votes).filter(v => v === "yes").length}
                    </div>
                    <div style={{ width: "1px", backgroundColor: "#333" }} />
                    <div style={{ color: "#ff7675", display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={room.voting.type === "teamApproval" ? "/red_seal.png" : "/red_card.png"} style={{ width: '25px' }} />
                      {Object.values(room.voting.votes).filter(v => v === "no").length}
                    </div>
                  </div>

                  {isGameMaster && (
                    <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
                      <button onClick={handleStartVote} style={{ ...primaryBtn, backgroundColor: "#c5a059", color: "#000", padding: "8px 25px" }}>Take Vote Again</button>
                      <button onClick={handleClearVote} style={{ ...primaryBtn, backgroundColor: "transparent", color: "#888", border: "1px solid #888", padding: "8px 25px" }}>Dismiss</button>
                      {room.voting.result === "Yes" && room.voting.type === "teamApproval" && (
                        <button onClick={handleStartSecretVote} style={{ ...primaryBtn, backgroundColor: "#c5a059", color: "#000", padding: "8px 25px" }}>Take Secret Vote</button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Styles for new and existing animations */}
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
            </div>
          )}
        </>
      )}
    </div>
  );
}