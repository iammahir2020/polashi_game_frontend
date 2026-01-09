import { MISSION_REQUIREMENTS } from "../../constants";
import type { Room } from "../../types/game";

const RoundTracker = ({ room }: { room: Room }) => {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', margin: '20px 0' }}>
        {MISSION_REQUIREMENTS.map((_, index) => {
          const roundNum = index + 1;
          const result = room.roundHistory[index]; // "Green" or "Red"
          const isActive = room.currentRound === roundNum;
  
          return (
            <div key={index} style={{ textAlign: 'center' }}>
              <div style={{
                width: '45px', height: '45px',
                borderRadius: '50%',
                border: isActive ? '2px solid #fff' : '1px solid #c5a059',
                backgroundColor: result === 'Green' ? '#2e7d32' : result === 'Red' ? '#c62828' : '#000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isActive ? '0 0 15px #c5a059' : 'none',
                transition: 'all 0.3s ease'
              }}>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{roundNum}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#c5a059', marginTop: '5px' }}>
                {roundNum === 4 ? "2 FAIL" : ""}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  export default RoundTracker;