import { useCallback, useEffect, useRef, useState } from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import type { CharacterType, Player, Room } from "../../types/game";
import { socketService } from "../../services/socket";
import { clearSession, loadSession, saveSession } from "../../services/sessionStore";
import { cleanRoomCode, normalizeName } from "../../lib/names";
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
import CreditFooter from "../CreditFooter";
import { uiButtonGhost, uiButtonGold } from "../../style/ui";
import { useLayout } from "../../hooks/useLayout";
import Backdrop from "../WarRoom/Backdrop";
import CampaignPanel from "../WarRoom/CampaignPanel";
import LandingHero from "../WarRoom/LandingHero";
import Panel from "../WarRoom/Panel";
import WideHeader from "../WarRoom/WideHeader";
import { columnStyle, mutedTextStyle } from "../WarRoom/styles";

// How long a General's just-sent team is trusted over the server's copy. Long
// enough to cover a slow round trip to the server; short enough that if the
// server ignored a proposal, the next click goes back to the server's team.
const PENDING_TEAM_MS = 3000;

const sameMembers = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

// How many "serverUpdating" answers in a row are retried (about a minute at
// the server's 2-second pace) before the player is told to refresh later.
const MAX_SERVER_UPDATING_RETRIES = 30;

// How long the "Room Closed" modal stays up before going home on its own.
const ROOM_CLOSED_REDIRECT_MS = 5000;

type DialogState = {
  kind: "notice" | "confirm";
  title: string;
  message: string;
  onConfirm?: () => void;
};

export default function GameDashboard() {
  const isConnectedToSocket = useNetworkStatus();
  const layout = useLayout();
  const [room, setRoom] = useState<Room | null>(null);
  const [roomCode, setRoomCode] = useState(() => loadSession().roomCode || "");
  const [name, setName] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(() => loadSession().playerId || null);
  const [wasKicked, setWasKicked] = useState(false);
  const [error, setError] = useState("");
  const [newConnection, setNetConnection] = useState<"ok" | "down">("down");
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<"code" | "link" | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(() => !!loadSession().roomCode);
  // True while the server answers our rejoin with "serverUpdating": it has our
  // room, but a deploy is still moving it between servers. Kept apart from
  // isReconnecting, whose 5-second give-up timer must not hide this wait.
  const [isServerUpdating, setIsServerUpdating] = useState(false);
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

  // One pending reset timer each for the create/join spinner and the "copied"
  // label. Starting a new action cancels the previous timer, so an old timer
  // can't clear the state of a newer action (Steps.md #7 and #8).
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The next rejoin attempt while the server is updating, and how many have
  // been made. Reset whenever the server gives a real answer.
  const updatingRetryRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; attempts: number }>({
    timer: null,
    attempts: 0,
  });
  useEffect(() => () => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    if (updatingRetryRef.current.timer) clearTimeout(updatingRetryRef.current.timer);
  }, []);

  // Ignores a repeat of the same action within a short window (double clicks,
  // impatient taps). The server is what enforces the rules; this only stops
  // accidental duplicates such as re-rolling the General twice.
  // The team this General last sent, while the server's copy is still on its
  // way back. The server only ever echoes whole teams, so building each click
  // on the server's (older) copy made quick clicks overwrite each other: pick
  // two names fast and only the second stayed. Each click now builds on this.
  const pendingTeamRef = useRef<{ team: string[]; sentAt: number } | null>(null);
  // Once the server's team matches what was sent, the server's copy is the
  // source of truth again.
  useEffect(() => {
    const pending = pendingTeamRef.current;
    if (pending && sameMembers(pending.team, room?.proposedTeam ?? [])) pendingTeamRef.current = null;
  }, [room?.proposedTeam]);

  const lastActionAtRef = useRef<Record<string, number>>({});
  const runOnce = useCallback((key: string, action: () => void, windowMs = 800) => {
    const now = Date.now();
    if (now - (lastActionAtRef.current[key] ?? -Infinity) < windowMs) return;
    lastActionAtRef.current[key] = now;
    action();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');

    if (urlRoom) {
      setRoomCode(cleanRoomCode(urlRoom));

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

    // Any real answer from the server ends a "server updating" wait.
    const stopWaitingForServer = () => {
      const retry = updatingRetryRef.current;
      if (retry.timer) clearTimeout(retry.timer);
      retry.timer = null;
      retry.attempts = 0;
      setIsServerUpdating(false);
    };

    // A deploy is moving our room to a new server. The seat is still ours, so
    // the session is kept and the rejoin is sent again after the wait the
    // server asked for. After about a minute of this something is wrong, so
    // the player is told to refresh later, and the session is still kept.
    socketService.onServerUpdating(({ retryInMs }) => {
      const retry = updatingRetryRef.current;
      if (retry.timer) clearTimeout(retry.timer);
      retry.attempts += 1;
      if (retry.attempts > MAX_SERVER_UPDATING_RETRIES) {
        stopWaitingForServer();
        setIsReconnecting(false);
        setDialogState({
          kind: "notice",
          title: "Server Still Updating",
          message: "Your seat is saved. Refresh the page in a minute to rejoin your game.",
        });
        return;
      }
      setIsServerUpdating(true);
      retry.timer = setTimeout(() => {
        retry.timer = null;
        const { roomCode: savedRoom, playerId: savedPlayer } = loadSession();
        // While disconnected there's nothing to send: the socket service
        // rejoins by itself as soon as the connection is back.
        if (savedRoom && savedPlayer && socketService.socket.connected) {
          socketService.reconnect(savedRoom, savedPlayer);
        }
      }, retryInMs);
    });

    socketService.onRoomJoined((data) => {
      stopWaitingForServer();
      setRoom(data.room);
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setIsReconnecting(false);
      setWasKicked(false);
      setError("");
      setLoadingAction(null);

      saveSession(data.roomCode, data.playerId, data.reconnectToken);
    });

    socketService.onRoomUpdated((updatedRoom: Room) => {
      const myId = loadSession().playerId;
      const amIInList = updatedRoom.players.some(p => p.id === myId);

      if (myId && !amIInList) {
        handleForceExit("You have been removed from the room.");
        setRoom(null);
        return;
      }
      setRoom(updatedRoom);
    });

    socketService.onError((msg) => {
      stopWaitingForServer();
      setError(msg);
      setErrorToast(msg);
      setIsReconnecting(false);
      setLoadingAction(null);
      if (msg.toLowerCase().includes("not found")) {
        clearSession();
        setDialogState({
          kind: "notice",
          title: "Room Not Found",
          message: msg || "An error occurred.",
        });
      }
    });

    socketService.socket.on("kicked", () => {
      handleForceExit("You have been kicked by the Game Master.");
      clearSession();
    });

    const { roomCode: savedRoom, playerId: savedPlayer } = loadSession();

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

  // The room is gone: the Game Master closed it, or a rejoin found it already
  // closed. The seat is useless now, so it's cleared, and a modal says what
  // happened before going back to the home screen, after a few seconds or as
  // soon as the player taps "OK". (It used to jump home after 1.5 s with no
  // explanation, which looked like the page had just reset.)
  const homeRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const goHome = () => {
      if (homeRedirectTimerRef.current) clearTimeout(homeRedirectTimerRef.current);
      homeRedirectTimerRef.current = null;
      window.location.href = "/";
    };

    socketService.onRoomDissolved(({ reason }) => {
      clearSession();

      // Any "server updating" wait is over: the server has answered.
      const retry = updatingRetryRef.current;
      if (retry.timer) clearTimeout(retry.timer);
      retry.timer = null;
      retry.attempts = 0;
      setIsServerUpdating(false);
      setIsReconnecting(false);

      setRoom(null);
      setRoomCode("");
      setPlayerId(null);
      setDialogState({
        kind: "notice",
        title: "Room Closed",
        message: reason === "closed_by_host"
          ? "The Game Master has closed this room. Returning you to the home screen..."
          : "This room is no longer available. Returning you to the home screen...",
        onConfirm: goHome,
      });

      if (homeRedirectTimerRef.current) clearTimeout(homeRedirectTimerRef.current);
      homeRedirectTimerRef.current = setTimeout(goHome, ROOM_CLOSED_REDIRECT_MS);
    });

    return () => {
      socketService.offRoomDissolved();
      if (homeRedirectTimerRef.current) clearTimeout(homeRedirectTimerRef.current);
    };
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

    socketService.onNotification((data) => {
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
    clearSession();
  };

  // Clears the create/join spinner after 5 s if the server never answers.
  const startLoading = (action: "create" | "join") => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    setLoadingAction(action);
    loadingTimerRef.current = setTimeout(() => setLoadingAction(null), 5000);
  };

  const cleanNameOrWarn = () => {
    const cleanName = normalizeName(name);
    if (!cleanName) setErrorToast("Please enter a name.");
    return cleanName;
  };

  const createRoom = () => {
    const cleanName = cleanNameOrWarn();
    if (!cleanName) return;
    startLoading("create");
    setWasKicked(false);
    socketService.createRoom(cleanName);
  };
  const joinRoom = () => {
    const cleanName = cleanNameOrWarn();
    const code = cleanRoomCode(roomCode);
    if (!cleanName || !code) return;
    startLoading("join");
    setWasKicked(false);
    socketService.joinRoom(code, cleanName);
  };

  const kickPlayer = (targetId: string) => { if (!playerId) return; runOnce(`kick:${targetId}`, () => socketService.kickPlayer(roomCode, targetId, playerId)); };
  const toggleLock = () => { if (!room || !playerId || room.gameStarted) return; runOnce("lock", () => socketService.lockRoom(roomCode, !room?.locked, playerId)); };
  // const handleStartGame = () => { if (!room || !playerId) return; setIsRevealed(false); socketService.startGame(roomCode, playerId); };
  const handleStartGame = (selectedCharIds: number[]) => {
    if (!room || !playerId) return;

    if (selectedActiveIds.length < 5 || selectedActiveIds.length > 10) {
      setErrorToast("The battalion must consist of 5 to 10 active players.");
      return;
    }
    setIsRevealed(false); 

    // Update this call to include the active IDs
    runOnce("startGame", () => socketService.startGame(
      roomCode,
      playerId,
      selectedActiveIds,
      selectedCharIds,
      !!room.disableSecretIntelligence
    ));
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
        runOnce("reset", () => socketService.resetGame(roomCode, playerId));
        setIsRevealed(false);
      },
    });
  };
  const handleAssignGeneral = () => { if (!room || !playerId) return; runOnce("assignGeneral", () => socketService.assignGeneral(roomCode, playerId), 1500); };

  const handleStartVote = () => { if (!room || !playerId || !room.gameStarted) return; runOnce("startVote", () => socketService.startVote(roomCode, playerId)); };
  const handleClearVote = () => { if (!room || !playerId || !room.gameStarted) return; runOnce("clearVote", () => socketService.clearVote(roomCode, playerId)); };
  const handleYesVote = () => { if (!room || !playerId || !room.gameStarted) return; runOnce("castVote", () => socketService.castVote(roomCode, playerId, "yes")); };
  const handleNoVote = () => { if (!room || !playerId || !room.gameStarted) return; runOnce("castVote", () => socketService.castVote(roomCode, playerId, "no")); };
  const handleCloseRoom = () => { if (!room || !playerId) return; runOnce("closeRoom", () => socketService.closeRoom(roomCode, playerId)); };
  const handleStartSecretVote = () => { if (!room || !playerId || !room.gameStarted) return; runOnce("startSecretVote", () => socketService.startSecretVote(roomCode, playerId)); };
  const handleSetTeam = (playerIds: string[]) => { if (!room || !playerId || !room.gameStarted) return; socketService.proposeTeam(roomCode, playerIds); };

  const leaveRoom = () => {
    const saved = loadSession();
    const currentRoomCode = roomCode || saved.roomCode;
    const myId = playerId || saved.playerId;
    if (currentRoomCode && myId) socketService.leaveRoom(currentRoomCode, myId);
    setRoom(null); setRoomCode(""); setPlayerId(null); setWasKicked(false); setError("");
    clearSession();
  };

  // Shows "copied" for 2 s; a newer copy restarts the window.
  const flashCopied = (type: "code" | "link") => {
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopiedStatus(type);
    copiedTimerRef.current = setTimeout(() => setCopiedStatus(null), 2000);
  };

  const handleCopy = async (type: "code" | "link") => {
    const textToCopy = type === "code"
      ? roomCode
      : `${window.location.origin}?room=${roomCode}`;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        flashCopied(type);
        return;
      } catch (err) {
        if (import.meta.env.DEV) console.error("Modern copy failed, switching to fallback", err);
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
        flashCopied(type);
      } else {
        throw new Error("ExecCommand returned false");
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Fallback copy failed", err);
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
        clearSession();
        window.location.href = "/";
      },
    });
  };

  const handleTogglePlayer = (id: string) => {
    // 1. Guard against invalid states
    if (!room || !playerId || !room.gameStarted) return;

    const pending = pendingTeamRef.current;
    const currentTeam = pending && Date.now() - pending.sentAt < PENDING_TEAM_MS
      ? pending.team
      : room.proposedTeam || [];
    const isSelected = currentTeam.includes(id);
    const sendTeam = (team: string[]) => {
      pendingTeamRef.current = { team, sentAt: Date.now() };
      handleSetTeam(team);
    };

    // 2. Identify the size of the active battalion (5-10)
    const activeCount = room.activePlayerIds?.length || 5;
    const roundIndex = (room.currentRound || 1) - 1;

    // 3. Look up the specific requirement for this game size and round
    // Correct access: MISSION_CONFIGS[totalActive][roundIndex]
    const currentReq = MISSION_CONFIGS[activeCount]?.[roundIndex];

    if (!currentReq) {
      if (import.meta.env.DEV) console.error("Mission configuration not found for active count:", activeCount);
      return;
    }

    // 4. Handle selection logic
    if (isSelected) {
      const newTeam = currentTeam.filter(pId => pId !== id);
      sendTeam(newTeam);
    } else {
      // Use the dynamic players requirement from our config
      if (currentTeam.length < currentReq.players) {
        const newTeam = [...currentTeam, id];
        sendTeam(newTeam);
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
      onConfirm: () => runOnce("investigate", () => socketService.investigate(roomCode, targetId, playerId), 1500),
    });
  };

  const handleAssassination = (targetId: string) => {
    if (!room || !playerId) return;
    runOnce("assassinate", () => socketService.attemptAssassination(roomCode, targetId, playerId), 1500);
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

  if (isServerUpdating) {
    return (
      <GameLoader message={"The server is updating. Reconnecting you to your game..."} />
    );
  }

  if (isReconnecting) {
    return (
      <GameLoader message={"Re-establishing Intelligence Links..."} />
    );
  }

  const isObserver = room && room.gameStarted && !room.activePlayerIds?.includes(playerId || "");

  // --- Pieces of the screen ---------------------------------------------------
  // Built here once and arranged below: the phone layout stacks them in one
  // column, the tablet and desktop layouts place them in columns.

  const renderRoster = (alwaysOpen = false) => room && (
    <PlayerRoster
      players={room.players}
      playerId={playerId}
      isGameMaster={isGameMaster}
      gameStarted={room.gameStarted}
      kickPlayer={kickPlayer}
      guptochorId={room.guptochorId}
      guptochorUsed={room.guptochorUsed}
      onInvestigate={handleInvestigate}

      // Before the game: the host's draft. Once it starts: the battalion the
      // server actually dealt in (the draft only exists on the host's device).
      selectedActiveIds={room.gameStarted ? room.activePlayerIds : selectedActiveIds}
      onToggleActive={toggleActivePlayer}
      alwaysOpen={alwaysOpen}
    />
  );

  const renderLauncher = (embedded = false) => room && (
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
      embedded={embedded}
    />
  );

  const renderConsole = (embedded = false) => room && (
    <CommandConsole
      room={room}
      isGameMaster={isGameMaster}
      playerId={playerId}
      toggleLock={toggleLock}
      handleStartVote={handleStartVote}
      handleResetGame={handleResetGame}
      handleDissolve={handleDissolve}
      embedded={embedded}
    />
  );

  const renderVoting = (inline = false) => room && (
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
      inline={inline}
    />
  );

  const renderIdentity = (embedded = false) => room && (
    <IdentityCard
      isRevealed={isRevealed}
      setIsRevealed={setIsRevealed}
      gameStarted={room.gameStarted}
      character={me?.character}
      secretIntel={room.disableSecretIntelligence ? [] : room.secretIntel}
      disableSecretIntelligence={!!room.disableSecretIntelligence}
      embedded={embedded}
    />
  );

  const renderBattalion = (embedded = false) => room && (
    <BattalionSelector
      room={room}
      me={me}
      handleTogglePlayer={handleTogglePlayer}
      handleStartVote={handleStartVote}
      isTurnComplete={isCurrentGeneralTurnComplete}
      embedded={embedded}
    />
  );

  const renderResultOverlay = () => room && (
    <GameResultOverlay
      room={room}
      isGameMaster={isGameMaster}
      handleResetGame={handleResetGame}
      primaryBtn={primaryBtn}
      playerId={playerId}
      isDismissed={isResultOverlayDismissed}
      onClose={() => setIsResultOverlayDismissed(true)}
    />
  );

  const enlistmentForm = (
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
  );

  const alerts = (
    <>
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
    </>
  );

  // Full-screen moments, the same in every layout.
  const generalRevealOverlay = (
    <GeneralReveal
      generalReveal={generalReveal}
      onClose={() => setGeneralReveal(null)}
    />
  );
  const intelPopupOverlay = (
    <IntelPopup
      intelPopup={intelPopup}
      onClose={() => setIntelPopup(null)}
    />
  );
  const mirJaforOverlay = room && (
    <MirJaforPhase
      room={room}
      playerId={playerId!}
      onAttemptAssassination={handleAssassination}
    />
  );

  const toastAndDialog = (
    <>
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
    </>
  );

  // --- Tablet and desktop ---------------------------------------------------
  if (layout !== "compact") {
    const isWide = layout === "wide";
    const sideWidth = isWide ? "340px" : "300px";
    const grid = (columns: string): React.CSSProperties => ({
      display: "grid",
      gridTemplateColumns: columns,
      gap: isWide ? "24px" : "20px",
      alignItems: "start",
    });

    let body: React.ReactNode = null;

    if (!room) {
      body = !wasKicked && (
        <div style={{ ...grid(`minmax(0, 1fr) minmax(360px, 440px)`), alignItems: "center", gap: isWide ? "64px" : "32px", minHeight: "calc(100vh - 220px)" }}>
          <LandingHero />
          <div>{enlistmentForm}</div>
        </div>
      );
    } else if (isObserver) {
      body = (
        <div style={grid(`minmax(0, 1fr) ${sideWidth}`)}>
          <Panel label="Spymaster's view">
            <ObserverScreen room={room} embedded />
          </Panel>
          <Panel title="Roster">{renderRoster(true)}</Panel>
        </div>
      );
    } else if (!room.gameStarted) {
      body = (
        <div style={grid(`minmax(0, 1fr) ${isWide ? "380px" : sideWidth}`)}>
          <div style={columnStyle}>
            <Panel title="War Council">
              <p style={{ ...mutedTextStyle, marginBottom: "18px" }}>
                {isGameMaster
                  ? "Everyone who joins is drafted into the battalion. Click a name in the roster to stand them down or draft them again. A campaign needs 5 to 10 players."
                  : "You are enlisted. The host will begin the campaign once everyone has arrived. Share the HQ code above to bring in more allies."}
              </p>
              {isGameMaster ? renderLauncher(true) : (
                <div style={{ color: "#bbb", fontSize: "14px" }}>
                  Secret Intel: {room.disableSecretIntelligence ? "Disabled" : "Enabled"}
                </div>
              )}
            </Panel>
            {renderConsole(true)}
          </div>
          <Panel title="Roster">{renderRoster(true)}</Panel>
        </div>
      );
    } else {
      const campaign = (
        <CampaignPanel
          room={room}
          me={me}
          currentGeneral={currentGeneral}
          isGameMaster={isGameMaster}
          awaitingNewGeneral={awaitingNewGeneral}
          isTurnComplete={isCurrentGeneralTurnComplete}
        />
      );
      const centre = (
        <div style={columnStyle}>
          {campaign}
          {/* Inline while the campaign is running. The vote that ends it (into
              Mir Jafor's turn or game over) stays a full-screen overlay, so its
              verdict sits above those screens until dismissed, as on phones. */}
          {renderVoting(room.gameStatus === "ACTIVE")}
          {renderBattalion(true)}
          {isGameMaster && <Panel title="Command">{renderLauncher(true)}</Panel>}
        </div>
      );
      const roster = <Panel title="Roster">{renderRoster(true)}</Panel>;

      body = isWide ? (
        <div style={grid(`320px minmax(0, 1fr) ${sideWidth}`)}>
          <div style={columnStyle}>{renderIdentity(true)}</div>
          {centre}
          <div style={columnStyle}>
            {roster}
            {renderConsole(true)}
          </div>
        </div>
      ) : (
        <div style={grid(`minmax(0, 1fr) ${sideWidth}`)}>
          {centre}
          <div style={columnStyle}>
            {renderIdentity(true)}
            {roster}
            {renderConsole(true)}
          </div>
        </div>
      );
    }

    return (
      <>
        <Backdrop />
        <div
          style={{
            // No z-index: overlays inside (vote confirmation, character picker)
            // must stack against the full-screen ones exactly as on phones.
            position: "relative",
            maxWidth: "1440px",
            margin: "0 auto",
            padding: isWide ? "20px 28px 32px" : "16px 20px 28px",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            gap: isWide ? "24px" : "20px",
            fontFamily: "'EB Garamond', serif",
            color: "#e0e0e0",
            lineHeight: "1.5",
          }}
        >
          <WideHeader
            newConnection={newConnection}
            isConnectedToSocket={isConnectedToSocket}
            room={room}
            playerId={playerId}
            roomCode={roomCode}
            handleCopy={handleCopy}
            copiedStatus={copiedStatus}
            leaveRoom={leaveRoom}
            dense={!isWide}
          />

          {alerts}
          {body}

          {/* Credits on the landing and lobby screens only, never over the board */}
          {!room?.gameStarted && <CreditFooter />}
        </div>

        {room && renderResultOverlay()}
        {room && !isObserver && (
          <>
            {generalRevealOverlay}
            {intelPopupOverlay}
            {mirJaforOverlay}
          </>
        )}
        {toastAndDialog}
      </>
    );
  }

  // --- Phone --------------------------------------------------------------------
  return (
    <div style={containerStyle}>

      <GameHeader
        newConnection={newConnection}
        isConnectedToSocket={isConnectedToSocket}
      />

      {alerts}

      {enlistmentForm}

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
              {renderResultOverlay()}
            </>
          ) : (
            <>

          {renderIdentity()}

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

          {renderBattalion()}

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

          {renderRoster()}

          {renderLauncher()}

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

          {renderConsole()}

          {generalRevealOverlay}

          {
            !isObserver && renderVoting()
          }

          {renderResultOverlay()}

          <RoundTracker room={room} />

          {intelPopupOverlay}

          {mirJaforOverlay}
            </>
          )}
        </>
      )}

      {/* Credits on the landing and lobby screens only, never over the board */}
      {!room?.gameStarted && <CreditFooter />}

      {toastAndDialog}
    </div>
  );
}
