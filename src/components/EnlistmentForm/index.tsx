import React from 'react';
import type { Room } from '../../types/game';

interface EnlistmentFormProps {
  room: Room | null;
  wasKicked: boolean;
  name: string;
  setName: (val: string) => void;
  roomCode: string;
  setRoomCode: (val: string) => void;
  loadingAction: "create" | "join" | null;
  createRoom: () => void;
  joinRoom: () => void;
  cardStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  primaryBtn: React.CSSProperties;
}

const EnlistmentForm: React.FC<EnlistmentFormProps> = ({
  room, wasKicked, name, setName, roomCode, setRoomCode,
  loadingAction, createRoom, joinRoom, cardStyle, inputStyle, primaryBtn
}) => {
  if (room || wasKicked) return null;

  return (
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
        fontSize: '12px', letterSpacing: '3px', fontWeight: 'bold', zIndex: 10
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
          <div>
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
    </div>
  );
};

export default EnlistmentForm;