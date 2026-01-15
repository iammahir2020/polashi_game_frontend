import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './components/login/AuthContext'
import GameDashboard from './components/GameDashboard'
import GameLoader from './components/Loader';
import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';

function App() {
  // Check if this is the first load of this session
  const [isBooting, setIsBooting] = useState(() => {
    return !sessionStorage.getItem('intro_played');
  });
  
  const [hasProceeded, setHasProceeded] = useState(() => {
    return !!sessionStorage.getItem('intro_played');
  });

  useEffect(() => {
    if (isBooting) {
      const bootTimer = setTimeout(() => {
        setIsBooting(false);
      }, 4000); 
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
        <Routes>
          <Route path="/" element={<GameDashboard />} />
        </Routes>
        <Analytics />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App