import { useEffect, useState } from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import type { Player, Room } from "../../types/game";
import { socketService } from "../../services/socket";
import GameLoader from "../Loader";
import { MISSION_REQUIREMENTS } from "../../constants";
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
      setIsReconnecting(false);
      setLoadingAction(null);
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

  useEffect(() => {
    socketService.onRoomDissolved(() => {
      localStorage.removeItem("roomCode");
      localStorage.removeItem("playerId");

      setTimeout(() => {
        window.location.reload();

      }, 500);
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
      alert(`Could not auto-copy. Please copy manually: ${textToCopy}`);
    }
  };

  const handleDissolve = () => {
    if (window.confirm("Terminate this session for all players?")) {
      handleCloseRoom();

      localStorage.removeItem("roomCode");
      localStorage.removeItem("playerId");
      window.location.href = "/";
    }
  };

  const handleTogglePlayer = (id: string) => {
    if (!room || !playerId || !room.gameStarted) return;

    const currentTeam = room.proposedTeam || [];
    const isSelected = currentTeam.includes(id);

    const roundIndex = (room.currentRound || 1) - 1;
    const currentReq = MISSION_REQUIREMENTS[roundIndex];

    if (!currentReq) return;

    if (isSelected) {
      const newTeam = currentTeam.filter(pId => pId !== id);
      handleSetTeam(newTeam);
    } else {
      if (currentTeam.length < currentReq.players) {
        const newTeam = [...currentTeam, id];
        handleSetTeam(newTeam);
      }
    }
  };

  const handleInvestigate = (targetId: string) => {
    if (!room || !playerId) return;

    // Safety check before emitting
    const target = room.players.find(p => p.id === targetId);
    if (window.confirm(`Deploy your informant to investigate ${target?.name}?`)) {
      socketService.investigate(roomCode, targetId, playerId);
    }
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

          <IdentityCard
            isRevealed={isRevealed}
            setIsRevealed={setIsRevealed}
            gameStarted={room.gameStarted}
            character={me?.character}
            secretIntel={room.secretIntel}
          />

          <BattalionSelector
            room={room}
            me={me}
            handleTogglePlayer={handleTogglePlayer}
            handleStartVote={handleStartVote}
          />

          <PlayerRoster
            players={room.players}
            playerId={playerId}
            isGameMaster={isGameMaster}
            gameStarted={room.gameStarted}
            kickPlayer={kickPlayer}
            guptochorId={room.guptochorId}
            guptochorUsed={room.guptochorUsed}
            onInvestigate={handleInvestigate}
          />

          <GameLauncher
            room={room}
            isGameMaster={isGameMaster}
            handleStartGame={handleStartGame}
            handleAssignGeneral={handleAssignGeneral}
            primaryBtn={primaryBtn}
          />

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

          <GameResultOverlay
            room={room}
            isGameMaster={isGameMaster}
            handleResetGame={handleResetGame}
            primaryBtn={primaryBtn}
          />

          <RoundTracker room={room} />

          <IntelPopup
            intelPopup={intelPopup}
            onClose={() => setIntelPopup(null)}
          />
        </>
      )}
    </div>
  );
}