// import React from 'react';
// import type { Room } from '../../types/game';

// interface GameLauncherProps {
//   room: Room | null;
//   isGameMaster: boolean;
//   handleStartGame: () => void;
//   handleAssignGeneral: () => void;
//   primaryBtn: React.CSSProperties;
// }

// const GameLauncher: React.FC<GameLauncherProps> = ({
//   room,
//   isGameMaster,
//   handleStartGame,
//   handleAssignGeneral,
//   primaryBtn
// }) => {
//   // Guard: Only show these major actions to the Game Master
//   if (!isGameMaster) return null;

//   // Configuration based on game state
//   const config = room && !room.gameStarted 
//     ? {
//         title: "Ready to assign secret roles?",
//         buttonText: room.players.length < 2 ? "Waiting for Recruits..." : "Begin Campaign",
//         action: handleStartGame,
//         disabled: room.players.length < 2
//       }
//     : {
//         title: "Ready to assign General?",
//         buttonText: "Appoint General",
//         action: handleAssignGeneral,
//         disabled: false
//       };

//   return (
//     <div style={{ textAlign: "center", marginBottom: "30px" }}>
//       <p style={{ 
//         color: "white", 
//         fontSize: "20px", 
//         fontFamily: "'EB Garamond', serif",
//         fontStyle: "italic" 
//       }}>
//         {config.title}
//       </p>

//       <button
//         onClick={config.action}
//         disabled={config.disabled}
//         style={{
//           ...primaryBtn,
//           backgroundColor: config.disabled ? "#333" : "#c5a059",
//           color: config.disabled ? "#666" : "#000",
//           height: "60px",
//           fontSize: "18px",
//           boxShadow: config.disabled ? "none" : "0 0 20px rgba(197, 160, 89, 0.3)",
//           textTransform: 'uppercase',
//           letterSpacing: '2px',
//           cursor: config.disabled ? "not-allowed" : "pointer",
//           transition: "all 0.3s ease"
//         }}
//       >
//         {config.buttonText}
//       </button>
//     </div>
//   );
// };

// export default GameLauncher;

import React from 'react';
import type { Room } from '../../types/game';

interface GameLauncherProps {
  room: Room | null;
  isGameMaster: boolean;
  handleStartGame: () => void;
  handleAssignGeneral: () => void;
  primaryBtn: React.CSSProperties;
  activeCount: number;
}

const GameLauncher: React.FC<GameLauncherProps> = ({
  room,
  isGameMaster,
  handleStartGame,
  handleAssignGeneral,
  primaryBtn,
  activeCount
}) => {
  if (!isGameMaster) return null;

  const isInvalid = activeCount < 5 || activeCount > 10;
  const isPreGame = room && !room.gameStarted;

  const config = isPreGame 
    ? {
        title: isInvalid 
          ? `Draft 5 to 10 operatives for the mission.` 
          : `Battalion ready with ${activeCount} members.`,
        buttonText: "Begin Campaign",
        action: handleStartGame,
        disabled: isInvalid
      }
    : {
        title: "The lines are drawn. Appoint a General.",
        buttonText: "Appoint General",
        action: handleAssignGeneral,
        disabled: false
      };

  return (
    <div style={{ textAlign: "center", marginBottom: "30px" }}>
      <p style={{ 
        color: isInvalid && isPreGame ? "#ff7675" : "#aaa", 
        fontSize: "18px", 
        fontFamily: "'EB Garamond', serif",
        fontStyle: "italic",
        marginBottom: "15px"
      }}>
        {config.title}
      </p>

      <button
        onClick={config.action}
        disabled={config.disabled}
        style={{
          ...primaryBtn,
          backgroundColor: config.disabled ? "#222" : "#c5a059",
          color: config.disabled ? "#444" : "#000",
          height: "60px",
          fontSize: "18px",
          boxShadow: config.disabled ? "none" : "0 0 25px rgba(197, 160, 89, 0.4)",
          textTransform: 'uppercase',
          letterSpacing: '2px',
          cursor: config.disabled ? "not-allowed" : "pointer",
          border: config.disabled ? "1px solid #333" : "none",
          transition: "all 0.3s ease"
        }}
      >
        {config.buttonText}
      </button>
    </div>
  );
};

export default GameLauncher;