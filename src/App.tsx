import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './components/login/AuthContext'
import GameLoader from './components/Loader';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import RouteSeoManager from './seo/RouteSeoManager';
import HowToPlay from './pages/HowToPlay';

// The game (and socket.io with it) loads only when the game route is opened.
const GameDashboard = lazy(() => import('./components/GameDashboard'));

// Static pages skip the intro splash so visitors (and crawlers) see content at once.
const STATIC_PATHS = ['/how-to-play'];

function App() {
  // Check if this is the first load of this session
  const [isBooting, setIsBooting] = useState(() => {
    return !sessionStorage.getItem('intro_played');
  });
  
  const [hasProceeded, setHasProceeded] = useState(() => {
    return !!sessionStorage.getItem('intro_played') || STATIC_PATHS.includes(window.location.pathname);
  });

  useEffect(() => {
    if (isBooting) {
      const bootTimer = setTimeout(() => {
        setIsBooting(false);
      }, 1200);
      return () => clearTimeout(bootTimer);
    }
  }, [isBooting]);

  const handleEnterGame = () => {
    sessionStorage.setItem('intro_played', 'true');
    setHasProceeded(true);
  };

  // --- 1. INTRO / SPLASH SEQUENCE ---
  if (!hasProceeded) {
    return (
      <GameLoader 
        message={isBooting ? "Establishing Intelligence Links..." : "Links Established."}
        showButton={!isBooting} 
        onProceed={handleEnterGame}
      />
    );
  }

  // --- 2. THE MAIN GAME ---
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteSeoManager />
        <Routes>
          <Route
            path="/"
            element={
              <Suspense fallback={<GameLoader message="Links Established." />}>
                <GameDashboard />
              </Suspense>
            }
          />
          <Route path="/how-to-play" element={<HowToPlay />} />
        </Routes>
        <Analytics />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App