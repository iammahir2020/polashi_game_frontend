import React from 'react';
import type { Room } from '../../types/game';

interface OperativeDrawerProps {
  room: Room;
  playerId: string | null;
  roomCode: string;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  handleCopy: (type: "code" | "link") => void;
  copiedStatus: "code" | "link" | null;
  leaveRoom: () => void;
}

const OperativeDrawer: React.FC<OperativeDrawerProps> = ({
  room,
  playerId,
  roomCode,
  isDrawerOpen,
  setIsDrawerOpen,
  handleCopy,
  copiedStatus,
  leaveRoom
}) => {
  const currentPlayerName = room.players.find(p => p.id === playerId)?.name || "Unknown";

  return (
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
              {currentPlayerName}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        overflow: 'hidden'
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
                  onClick={(e) => { e.stopPropagation(); handleCopy("code"); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#fff' }}
                  title="Copy Cipher"
                >
                  {copiedStatus === "code" ? "✅" : "📋"}
                </button>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleCopy("link"); }}
              style={{
                backgroundColor: copiedStatus === "link" ? '#c5a059' : 'transparent',
                border: '1px solid #c5a059',
                color: copiedStatus === "link" ? '#000' : '#c5a059',
                padding: '10px 15px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
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
              onClick={(e) => { e.stopPropagation(); leaveRoom(); }}
              style={{
                background: 'none',
                border: '1px solid #444',
                color: '#888',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '9px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.color = '#ff7675'; 
                e.currentTarget.style.borderColor = '#ff7675'; 
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.color = '#888'; 
                e.currentTarget.style.borderColor = '#444'; 
              }}
            >
              Abandon Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperativeDrawer;