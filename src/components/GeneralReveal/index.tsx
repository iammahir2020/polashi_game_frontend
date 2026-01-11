import React from 'react';

interface GeneralRevealData {
  active: boolean;
  flipping: boolean;
  name?: string;
}

interface GeneralRevealProps {
  generalReveal: GeneralRevealData | null;
  onClose: () => void;
}

const GeneralReveal: React.FC<GeneralRevealProps> = ({ generalReveal, onClose }) => {
  if (!generalReveal?.active) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.96)",
        zIndex: 20000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backdropFilter: "blur(5px)"
      }}
    >
      {generalReveal.flipping ? (
        /* PHASE 1: SPINNING COIN */
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div className="gold-mohur">👑</div>
          <p style={{
            color: "#c5a059",
            marginTop: "30px",
            fontFamily: "'Cinzel', serif",
            letterSpacing: "3px",
            animation: "pulseText 1.5s infinite",
            textTransform: "uppercase"
          }}>
            Consulting the Commanders...
          </p>
        </div>
      ) : (
        /* PHASE 2: THE REVEAL */
        <div style={{ 
          textAlign: "center", 
          animation: "revealPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)" 
        }}>
          <div style={{ fontSize: "60px", marginBottom: "10px" }}>🎖️</div>
          <h2 style={{ 
            fontFamily: "'Cinzel', serif", 
            color: "#c5a059", 
            margin: 0, 
            letterSpacing: "2px",
            fontSize: "14px",
            textTransform: "uppercase"
          }}>
            General Assigned
          </h2>
          <h1 style={{
            fontFamily: "'Cinzel', serif", 
            color: "white", 
            fontSize: "48px",
            margin: "10px 0", 
            textShadow: "0 0 20px rgba(197, 160, 89, 0.6)"
          }}>
            {generalReveal.name}
          </h1>
          <p style={{ 
            fontFamily: "'EB Garamond', serif", 
            color: "#aaa", 
            fontStyle: "italic", 
            fontSize: "18px",
            maxWidth: "300px",
            margin: "0 auto"
          }}>
            "The fate of Bengal rests upon your blade."
          </p>
          <p style={{ color: "#444", fontSize: "10px", marginTop: "40px", letterSpacing: "1px" }}>
            CLICK ANYWHERE TO CONTINUE
          </p>
        </div>
      )}

      <RevealStyles />
    </div>
  );
};

// --- CSS ANIMATIONS ---
const RevealStyles = () => (
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
);

export default GeneralReveal;