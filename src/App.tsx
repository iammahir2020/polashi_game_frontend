import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './components/login/AuthContext'
import GameDashboard from './components/GameDashboard'

function App() {
  return (
    <>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* <Route path="/" element={<LoginForm />} /> */}
          
          <Route 
            path="/" 
            element={
              // <ProtectedRoute>
                <GameDashboard />
              // </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </>
  )
}

export default App