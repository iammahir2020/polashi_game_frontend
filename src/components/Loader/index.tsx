import React from 'react';

interface GameLoaderProps {
    message?: string;
    showButton?: boolean;
    onProceed?: () => void;
  }

const GameLoader: React.FC<GameLoaderProps> = ({ message = "Communicating with Command..." , showButton=false, onProceed}) => {

  return (
    <div style={{
      height: "100dvh", width: "100vw",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      position: "fixed", top: 0, left: 0, zIndex: 9999, // Layer it over everything
      backgroundColor: "#000",
      backgroundSize: "cover", backgroundPosition: "center",
      fontFamily: "'Cinzel', serif", overflow: "hidden"
    }}>
      {/* Background Video */}
      <video
        autoPlay muted loop playsInline
        style={{
          position: "absolute", top: "50%", left: "50%",
          minWidth: "110%", minHeight: "110%",
          transform: "translate(-50%, -50%) scale(0.95)",
          objectFit: "cover", zIndex: 0, filter: "blur(1px)"
        }}
      >
        <source src="/polashi_bg.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8))",
        zIndex: 1
      }} />

      {/* Content */}
      <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img 
          src="/polashi_fav_high_res.png" 
          alt="Logo" 
          style={{ width: '80px', marginBottom: '30px', animation: 'pulse 3s infinite ease-in-out' }} 
        />
        <div className="shimmer-effect" style={{ fontSize: "22px", marginBottom: "20px", textAlign: 'center' }}>
          {message}
        </div>
        {/* --- DYNAMIC TRANSITION --- */}
        {!showButton ? (
          <div className="spinner" />
        ) : (
          <button 
            onClick={onProceed}
            className="proceed-button"
          >
            ENTER POLASHI
          </button>
        )}
      </div>

      <style>{`
        .spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(197, 160, 89, 0.1);
          border-top: 3px solid #c5a059;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } }
        .shimmer-effect {
          background: linear-gradient(90deg, #c5a059 0%, #fff 50%, #c5a059 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        @keyframes shimmer { to { background-position: 200% center; } }
        .proceed-button {
          margin-top: 20px;
          padding: 12px 40px;
          background: transparent;
          border: 1px solid #c5a059;
          color: #c5a059;
          font-family: 'Cinzel', serif;
          font-size: 18px;
          letter-spacing: 3px;
          cursor: pointer;
          transition: all 0.5s ease;
          animation: fadeIn 1.5s ease-in;
          box-shadow: 0 0 10px rgba(197, 160, 89, 0.2);
        }

        .proceed-button:hover {
          background: #c5a059;
          color: #000;
          box-shadow: 0 0 25px rgba(197, 160, 89, 0.6);
          transform: translateY(-2px);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default GameLoader;