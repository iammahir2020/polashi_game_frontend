import React from 'react';
import { useI18n } from '../../i18n/useI18n';

interface GameLoaderProps {
    message?: string;
    showButton?: boolean;
    onProceed?: () => void;
  }

// Landscape screens tall enough to fit the content under the wide scene's
// painted title (desktops, laptops, tablets) get the wide scene; portrait
// screens and phones held sideways get the vertical one. The browser downloads
// only the one it shows.
const WIDE_SCREEN = '(min-aspect-ratio: 1/1) and (min-height: 500px)';

const GameLoader: React.FC<GameLoaderProps> = ({ message, showButton=false, onProceed}) => {
  const { t } = useI18n();
  return (
    <div className="loader-root" style={{
      height: "100dvh", width: "100vw",
      display: "flex", flexDirection: "column",
      alignItems: "center",
      position: "fixed", top: 0, left: 0, zIndex: 9999, // Layer it over everything
      backgroundColor: "#000",
      fontFamily: "'Cinzel', serif", overflow: "hidden"
    }}>
      {/* Shown while the image loads, or if it can't */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(circle at 50% 20%, rgba(197,160,89,0.22), transparent 45%), linear-gradient(180deg, #111 0%, #050505 100%)",
        }}
      />
      <picture>
        <source media={WIDE_SCREEN} srcSet="/polashi_bg_wide.webp" type="image/webp" />
        <source media={WIDE_SCREEN} srcSet="/polashi_bg_wide.jpg" />
        <source srcSet="/polashi_bg.webp" type="image/webp" />
        <img
          className="loader-bg"
          src="/polashi_bg.jpg"
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />
      </picture>

      {/* Overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8))",
        zIndex: 1
      }} />

      {/* Content */}
      <div style={{ zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img 
          src="/Nawab.png"
          width={80}
          height={80}
          alt={t('loader.logoAlt')} 
          decoding="async"
          style={{ width: '80px', marginBottom: '30px', animation: 'pulse 3s infinite ease-in-out' }} 
        />
        <div className="shimmer-effect" style={{ fontSize: "22px", marginBottom: "20px", textAlign: 'center' }}>
          {message ?? t('loader.default')}
        </div>
        {/* --- DYNAMIC TRANSITION --- */}
        {!showButton ? (
          <div className="spinner" />
        ) : (
          <button 
            onClick={onProceed}
            className="proceed-button"
          >
            {t('loader.enter')}
          </button>
        )}
      </div>

      <style>{`
        /* Portrait: content centred over the scene. Landscape: the wide scene
           has the title painted on its left, so the image keeps its left edge
           and the content sits low, in the open ground between the armies. */
        .loader-root { justify-content: center; }
        .loader-bg { object-position: center; }
        @media ${WIDE_SCREEN} {
          .loader-root { justify-content: flex-end; padding-bottom: max(32px, 9vh); }
          .loader-bg { object-position: left center; }
        }
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