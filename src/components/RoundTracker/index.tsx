import { MISSION_CONFIGS } from "../../constants";
import type { Room } from "../../types/game";

const RoundTracker = ({ room }: { room: Room }) => {
  // Guard clause: ensure room exists and game has started
  if (!room || !room.gameStarted) return null;

  // 1. Get the total number of active players (usually 5 to 10)
  const activeCount = room.activePlayerIds?.length || 5; 
  
  // 2. Get the specific 5-round configuration for this group size
  // If the count isn't in our config, we default to the 5-player array to prevent crashing
  const currentConfig = MISSION_CONFIGS[activeCount] || MISSION_CONFIGS[5];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', margin: '20px 0' }}>
      {currentConfig.map((config, index) => {
        const roundNum = index + 1;
        const result = room.roundHistory[index]; // "Green" or "Red"
        const isActive = room.currentRound === roundNum;

        return (
          <div key={index} style={{ textAlign: 'center' }}>
            <div style={{
              width: '45px', 
              height: '45px',
              borderRadius: '50%',
              border: isActive ? '2px solid #fff' : '1px solid #c5a059',
              backgroundColor: result === 'Green' ? '#2e7d32' : result === 'Red' ? '#c62828' : '#000',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: isActive ? '0 0 15px #c5a059' : 'none',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>{roundNum}</span>
              
              {/* Optional: Show how many players are needed for this specific round inside the circle */}
              <div style={{ 
                position: 'absolute', 
                bottom: '-5px', 
                fontSize: '9px', 
                background: '#c5a059', 
                color: '#000', 
                padding: '0 4px', 
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {config.players}P
              </div>
            </div>

            {/* Dynamic "2 FAIL" label: only shows if this specific config for this specific round requires 2 fails */}
            <div style={{ fontSize: '10px', color: '#c5a059', marginTop: '10px', minHeight: '12px' }}>
              {config.failsRequired > 1 ? `${config.failsRequired} FAILS` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RoundTracker;