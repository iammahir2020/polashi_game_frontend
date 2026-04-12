import { useEffect, useState } from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import type { CharacterType, Player, Room } from "../../types/game";
import { socketService } from "../../services/socket";
import GameLoader from "../Loader";
import { MISSION_CONFIGS } from "../../constants";
import RoundTracker from "../RoundTracker";
import RoomLockedAlert from "../RoomLockedAlert";
import AccessRevoked from "../AccessRevoked";
import EnlistmentForm from "../EnlistmentForm";
import OperativeDrawer from "../OperativeDrawer";
import GameResultOverlay from "../GameResultOverlay";
import VotingSystem from "../VotingSystem";
import GeneralReveal from "../GeneralReveal";
import CommandConsole from "../CommandConsole";
import IdentityCard from "../IdentityCard";
import GameLauncher from "../GameLauncher";
import PlayerRoster from "../PlayerRoster";
import BattalionSelector from "../BattalionSelector";
import GameHeader from "../GameHeader";
import IntelPopup from "../IntepPopup";
import MirJaforPhase from "../MirJaforPhase";
import ObserverScreen from "../ObserverScreen";
import { uiButtonGhost, uiButtonGold } from "../../style/ui";

type DialogState = {
  kind: "notice" | "confirm";
  title: string;
  message: string;
  onConfirm?: () => void;
};

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
  const [intelPopup, setIntelPopup] = useState<{ message: string; type: 'private' | 'public' } | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [selectedActiveIds, setSelectedActiveIds] = useState<string[]>([]);
  const [characterList, setCharacterList] = useState<CharacterType[]>([]);
  const [isResultOverlayDismissed, setIsResultOverlayDismissed] = useState(false);
  const [awaitingNewGeneral, setAwaitingNewGeneral] = useState(false);
  const [completedGeneralId, setCompletedGeneralId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);

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
    socketService.onCharacterList((list) => {
      setCharacterList(list);
    });
  
    // Request the list immediately
    socketService.requestCharacterList();
  
    return () => socketService.offCharacterList();
  }, []);

  useEffect(() => {
    socketService.connect();

    socketService.onRoomJoined((data: any) => {
      setRoom(data.room);
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setIsReconnecting(false);
      setWasKicked(false);
      setError("");
      setLoadingAction(null);

      localStorage.setItem("roomCode", data.roomCode);
      localStorage.setItem("playerId", data.playerId);
    });

    socketService.onRoomUpdated((updatedRoom: Room) => {
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
      setErrorToast(msg);
      setIsReconnecting(false);
      setLoadingAction(null);
      if (msg.toLowerCase().includes("not found")) {
        localStorage.removeItem("roomCode");
        localStorage.removeItem("playerId");
        setDialogState({
          kind: "notice",
          title: "Room Not Found",
          message: msg || "An error occurred.",
        });
      }
    });

    socketService.socket.on("kicked", () => {
      handleForceExit("You have been kicked by the Game Master.");
      localStorage.removeItem("roomCode");
      localStorage.removeItem("playerId");
    });

    const savedRoom = localStorage.getItem("roomCode");
    const savedPlayer = localStorage.getItem("playerId");

    if (savedRoom && savedPlayer) {
      socketService.reconnect(savedRoom, savedPlayer);

      const timeout = setTimeout(() => setIsReconnecting(false), 5000);
      return () => clearTimeout(timeout);
    } else {
      setIsReconnecting(false);
    }

    return () => {
      socketService.offAll();
    };
  }, []);

  useEffect(() => {
    if (!errorToast) return;
    const timer = setTimeout(() => setErrorToast(null), 3500);
    return () => clearTimeout(timer);
  }, [errorToast]);

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
      }, 8000);
    }
    return () => clearTimeout(timer);
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

  // useEffect(() => {
  //   socketService.onRoomDissolved(() => {
  //     localStorage.removeItem("roomCode");
  //     localStorage.removeItem("playerId");

  //     setTimeout(() => {
  //       window.location.reload();

  //     }, 500);
  //   });

  //   return () => socketService.offRoomDissolved();
  // }, []);

  useEffect(() => {
    socketService.onRoomDissolved(() => {
      // 1. Clear Local Storage
      localStorage.removeItem("roomCode");
      localStorage.removeItem("playerId");
  
      // 2. Clear Local State to force the "Join/Create" UI to show
      setRoom(null);
      setRoomCode("");
      setPlayerId(null);
      setError("The Game Master has dissolved the HQ.");
  
      // 3. Optional: Redirect or Reload
      setTimeout(() => {
        window.location.href = "/"; // Hard redirect to home
      }, 1500);
    });
  
    return () => socketService.offRoomDissolved();
  }, []);

  useEffect(() => {
    socketService.onGuptochorResult((data) => {
      const allianceLabel = data.alliance.includes("Nawabs")
        ? "নবাবের অনুগত (Nawab Loyalist) 🟢"
        : "কোম্পানির চর (EIC Traitor) 🔴";

      setIntelPopup({
        message: `📜 গোপন প্রতিবেদন (Secret Report):\nTarget: ${data.targetName}\nIdentity: ${allianceLabel}`,
        type: 'private'
      });

      // setTimeout(() => setIntelPopup(null), 8000); // Private info stays longer
    });

    socketService.onNotification((data: any) => {
      if (data.requesterId === playerId) return;

      let displayMessage = data.message;

      if (data.targetId === playerId) {
        const requesterName = room?.players.find(p => p.id === data.requesterId)?.name || "Someone";
        displayMessage = `⚠️ সতর্কবার্তা (Warning): ${requesterName} has deployed a Guptochor to investigate YOU!`;
      }

      setIntelPopup({
        message: displayMessage,
        type: 'public'
      });

      // setTimeout(() => setIntelPopup(null), 5000);
    });

    return () => {
      socketService.offGuptochorResult();
      socketService.offNotification();
    };
  }, [playerId, room?.players]);

  useEffect(() => {
    if (room && !room.gameStarted) {
      // Optional: Auto-select everyone if total players <= 10
      if (room.players.length <= 10) {
        setSelectedActiveIds(room.players.map(p => p.id));
      }
    }
  }, [room?.players.length, room?.gameStarted]);

  useEffect(() => {
    if (room?.gameStatus !== "OVER") {
      setIsResultOverlayDismissed(false);
    }
  }, [room?.gameStatus]);

  useEffect(() => {
    if (!room?.gameStarted || room.gameStatus === "OVER") {
      setAwaitingNewGeneral(false);
      setCompletedGeneralId(null);
      return;
    }

    const general = room.players.find((p) => p.isGeneral) || null;

    if (room.voting?.active) {
      setAwaitingNewGeneral(false);
      setCompletedGeneralId(null);
      return;
    }

    if (room.voting && !room.voting.active && !!room.voting.result) {
      setAwaitingNewGeneral(true);
      setCompletedGeneralId(general?.id ?? null);
      return;
    }

    if (awaitingNewGeneral && completedGeneralId && general && general.id !== completedGeneralId) {
      setAwaitingNewGeneral(false);
      setCompletedGeneralId(null);
    }
  }, [
    room?.gameStarted,
    room?.gameStatus,
    room?.voting?.active,
    room?.voting?.result,
    room?.players,
    awaitingNewGeneral,
    completedGeneralId,
  ]);

  const me = room?.players.find(p => p.id === playerId);
  const isGameMaster = me?.isGameMaster === true;
  const isCurrentGeneralTurnComplete = !!me?.isGeneral && awaitingNewGeneral && completedGeneralId === me?.id;

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
  // const handleStartGame = () => { if (!room || !playerId) return; setIsRevealed(false); socketService.startGame(roomCode, playerId); };
  const handleStartGame = (selectedCharIds: number[]) => {
    if (!room || !playerId) return;

    if (selectedActiveIds.length < 5 || selectedActiveIds.length > 10) {
      setErrorToast("The battalion must consist of 5 to 10 active players.");
      return;
    }
    setIsRevealed(false); 

    // Update this call to include the active IDs
    socketService.startGame(
      roomCode,
      playerId,
      selectedActiveIds,
      selectedCharIds,
      !!room.disableSecretIntelligence
    );
  };

  const handleToggleDisableSecretIntelligence = (disableSecretIntelligence: boolean) => {
    if (!room || !playerId || !isGameMaster || room.gameStarted) return;
    socketService.setDisableSecretIntelligence(roomCode, playerId, disableSecretIntelligence);
  };

  const handleResetGame = () => {
    if (!room || !playerId) return;
    setDialogState({
      kind: "confirm",
      title: "Reset Campaign",
      message: "Reset the game for all players?",
      onConfirm: () => {
        socketService.resetGame(roomCode, playerId);
        setIsRevealed(false);
      },
    });
  };
  const handleAssignGeneral = () => { if (!room || !playerId) return; socketService.assignGeneral(roomCode, playerId); };

  const handleStartVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.startVote(roomCode, playerId); };
  const handleClearVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.clearVote(roomCode, playerId); };
  const handleYesVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.castVote(roomCode, playerId, "yes"); };
  const handleNoVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.castVote(roomCode, playerId, "no"); };
  const handleCloseRoom = () => { if (!room || !playerId) return; socketService.closeRoom(roomCode, playerId); };
  const handleStartSecretVote = () => { if (!room || !playerId || !room.gameStarted) return; socketService.startSecretVote(roomCode, playerId); };
  const handleSetTeam = (playerIds: string[]) => { if (!room || !playerId || !room.gameStarted) return; socketService.proposeTeam(roomCode, playerIds); };

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

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedStatus(type);
        setTimeout(() => setCopiedStatus(null), 2000);
        return;
      } catch (err) {
        console.error("Modern copy failed, switching to fallback", err);
      }
    }
    try {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;

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
      setErrorToast(`Could not auto-copy. Please copy manually: ${textToCopy}`);
    }
  };

  const handleDissolve = () => {
    setDialogState({
      kind: "confirm",
      title: "Close HQ",
      message: "Terminate this session for all players?",
      onConfirm: () => {
        handleCloseRoom();
        localStorage.removeItem("roomCode");
        localStorage.removeItem("playerId");
        window.location.href = "/";
      },
    });
  };

  const handleTogglePlayer = (id: string) => {
    // 1. Guard against invalid states
    if (!room || !playerId || !room.gameStarted) return;

    const currentTeam = room.proposedTeam || [];
    const isSelected = currentTeam.includes(id);

    // 2. Identify the size of the active battalion (5-10)
    const activeCount = room.activePlayerIds?.length || 5;
    const roundIndex = (room.currentRound || 1) - 1;

    // 3. Look up the specific requirement for this game size and round
    // Correct access: MISSION_CONFIGS[totalActive][roundIndex]
    const currentReq = MISSION_CONFIGS[activeCount]?.[roundIndex];

    if (!currentReq) {
      console.error("Mission configuration not found for active count:", activeCount);
      return;
    }

    // 4. Handle selection logic
    if (isSelected) {
      const newTeam = currentTeam.filter(pId => pId !== id);
      handleSetTeam(newTeam);
    } else {
      // Use the dynamic players requirement from our config
      if (currentTeam.length < currentReq.players) {
        const newTeam = [...currentTeam, id];
        handleSetTeam(newTeam);
      }
    }
  };

  const handleInvestigate = (targetId: string) => {
    if (!room || !playerId) return;

    const target = room.players.find(p => p.id === targetId);
    setDialogState({
      kind: "confirm",
      title: "Deploy Informant",
      message: `Deploy your informant to investigate ${target?.name}?`,
      onConfirm: () => socketService.investigate(roomCode, targetId, playerId),
    });
  };

  const handleAssassination = (targetId: string) => {
    if (!room || !playerId) return;
    socketService.attemptAssassination(roomCode, targetId, playerId);
  };

  const toggleActivePlayer = (id: string) => {
    if (!isGameMaster || room?.gameStarted) return;

    setSelectedActiveIds(prev => {
      if (prev.includes(id)) return prev.filter(pId => pId !== id);
      if (prev.length >= 10) return prev; // Limit to 10
      return [...prev, id];
    });
  };

  const containerStyle: React.CSSProperties = {
    padding: "10px",
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

  const isObserver = room && room.gameStarted && !room.activePlayerIds?.includes(playerId || "");


  return (
    <div style={containerStyle}>

      <GameHeader
        newConnection={newConnection}
        isConnectedToSocket={isConnectedToSocket}
      />

      <RoomLockedAlert
        error={error}
        wasKicked={wasKicked}
        cardStyle={cardStyle}
      />


      <AccessRevoked
        wasKicked={wasKicked}
        room={room}
        error={error}
        cardStyle={cardStyle}
        primaryBtn={primaryBtn}
        onClose={() => {
          setWasKicked(false);
          setError("");
        }}
      />

      <EnlistmentForm
        room={room}
        wasKicked={wasKicked}
        name={name}
        setName={setName}
        roomCode={roomCode}
        setRoomCode={setRoomCode}
        loadingAction={loadingAction}
        createRoom={createRoom}
        joinRoom={joinRoom}
        cardStyle={cardStyle}
        inputStyle={inputStyle}
        primaryBtn={primaryBtn}
      />

      {room && (
        <>
          <OperativeDrawer
            room={room}
            playerId={playerId}
            roomCode={roomCode}
            isDrawerOpen={isDrawerOpen}
            setIsDrawerOpen={setIsDrawerOpen}
            handleCopy={handleCopy}
            copiedStatus={copiedStatus}
            leaveRoom={leaveRoom}
          />

          {isObserver ? (
            <>
              <ObserverScreen room={room} />
              <GameResultOverlay
                room={room}
                isGameMaster={isGameMaster}
                handleResetGame={handleResetGame}
                primaryBtn={primaryBtn}
                playerId={playerId}
                isDismissed={isResultOverlayDismissed}
                onClose={() => setIsResultOverlayDismissed(true)}
              />
            </>
          ) : (
            <>

          <IdentityCard
            isRevealed={isRevealed}
            setIsRevealed={setIsRevealed}
            gameStarted={room.gameStarted}
            character={me?.character}
            secretIntel={room.disableSecretIntelligence ? [] : room.secretIntel}
            disableSecretIntelligence={!!room.disableSecretIntelligence}
          />

          {room.gameStarted && currentGeneral && (
            <div
              style={{
                margin: "10px 0 14px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(197, 160, 89, 0.45)",
                backgroundColor: "rgba(197, 160, 89, 0.08)",
                color: "#e7d6ad",
                textAlign: "center",
                fontSize: "13px",
                letterSpacing: "0.4px"
              }}
            >
              Current General: <strong>{currentGeneral.name}</strong>
            </div>
          )}

          <BattalionSelector
            room={room}
            me={me}
            handleTogglePlayer={handleTogglePlayer}
            handleStartVote={handleStartVote}
            isTurnComplete={isCurrentGeneralTurnComplete}
          />

          {room.gameStarted && awaitingNewGeneral && (
            <div
              style={{
                margin: "8px 0 14px",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(197, 160, 89, 0.35)",
                backgroundColor: "rgba(197, 160, 89, 0.08)",
                color: "#e7d6ad",
                textAlign: "center",
                fontSize: "13px",
              }}
            >
              {isCurrentGeneralTurnComplete ? "Your turn is done, waiting for new general" : "Waiting for new general"}
            </div>
          )}

          <PlayerRoster
            players={room.players}
            playerId={playerId}
            isGameMaster={isGameMaster}
            gameStarted={room.gameStarted}
            kickPlayer={kickPlayer}
            guptochorId={room.guptochorId}
            guptochorUsed={room.guptochorUsed}
            onInvestigate={handleInvestigate}

            selectedActiveIds={selectedActiveIds}
            onToggleActive={toggleActivePlayer}
          />

          <GameLauncher
            room={room}
            isGameMaster={isGameMaster}
            handleStartGame={handleStartGame}
            handleAssignGeneral={handleAssignGeneral}
            disableSecretIntelligence={!!room.disableSecretIntelligence}
            onToggleDisableSecretIntelligence={handleToggleDisableSecretIntelligence}
            primaryBtn={primaryBtn}

            activeCount={selectedActiveIds.length}
            characterList={characterList}
          />

          {!isGameMaster && !room.gameStarted && (
            <div
              style={{
                margin: "8px 0 16px",
                fontSize: "13px",
                color: "#bbb",
                textAlign: "center",
              }}
            >
              Secret Intel: {room.disableSecretIntelligence ? "Disabled" : "Enabled"}
            </div>
          )}

          <CommandConsole
            room={room}
            isGameMaster={isGameMaster}
            playerId={playerId}
            toggleLock={toggleLock}
            handleStartVote={handleStartVote}
            handleResetGame={handleResetGame}
            handleDissolve={handleDissolve}
          />

          <GeneralReveal
            generalReveal={generalReveal}
            onClose={() => setGeneralReveal(null)}
          />

          {
            !isObserver && (


              <VotingSystem
                room={room}
                playerId={playerId}
                isGameMaster={isGameMaster}
                handleYesVote={handleYesVote}
                handleNoVote={handleNoVote}
                handleClearVote={handleClearVote}
                handleStartVote={handleStartVote}
                handleStartSecretVote={handleStartSecretVote}
                primaryBtn={primaryBtn}
              />
            )
          }


          <GameResultOverlay
            room={room}
            isGameMaster={isGameMaster}
            handleResetGame={handleResetGame}
            primaryBtn={primaryBtn}
            playerId={playerId}
            isDismissed={isResultOverlayDismissed}
            onClose={() => setIsResultOverlayDismissed(true)}
          />

          <RoundTracker room={room} />

          <IntelPopup
            intelPopup={intelPopup}
            onClose={() => setIntelPopup(null)}
          />

          <MirJaforPhase
            room={room}
            playerId={playerId!}
            onAttemptAssassination={handleAssassination}
          />
            </>
          )}
        </>
      )}

      {errorToast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: "18px",
            transform: "translateX(-50%)",
            zIndex: 10000,
            backgroundColor: "rgba(127, 29, 29, 0.96)",
            border: "1px solid rgba(239, 68, 68, 0.6)",
            color: "#ffe9e9",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            maxWidth: "90vw",
          }}
          role="alert"
          aria-live="assertive"
        >
          {errorToast}
        </div>
      )}

      {dialogState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.78)",
            zIndex: 21000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          role="dialog"
          aria-modal="true"
          aria-label={dialogState.title}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "#151515",
              border: "1px solid rgba(197, 160, 89, 0.35)",
              borderRadius: "12px",
              padding: "18px",
              boxShadow: "0 14px 30px rgba(0,0,0,0.55)",
            }}
          >
            <h3
              style={{
                margin: "0 0 8px",
                color: "#e7d6ad",
                fontFamily: "'Cinzel', serif",
                fontSize: "16px",
                letterSpacing: "0.6px",
              }}
            >
              {dialogState.title}
            </h3>
            <p style={{ margin: "0", color: "#bfbfbf", fontSize: "14px", lineHeight: 1.5 }}>
              {dialogState.message}
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              {dialogState.kind === "confirm" && (
                <button
                  onClick={() => setDialogState(null)}
                  style={uiButtonGhost}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  const callback = dialogState.onConfirm;
                  setDialogState(null);
                  callback?.();
                }}
                style={uiButtonGold}
              >
                {dialogState.kind === "confirm" ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}