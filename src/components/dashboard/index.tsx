import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '../../auth/useAuth';
import { logout } from '../../auth/googleAuth';
import { useAuth } from '../login/AuthContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
      const { user, loading } = useFirebaseAuth();
      const { logout: contextLogout } = useAuth();
  
      if (loading) return null;

  const handleLogout = () => {
    logout();
    contextLogout();
    navigate('/');
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Welcome to the Dashboard!</h1>
      <p>You have successfully logged in.</p>
      <h4>{user?.displayName}</h4>
      <p>{user?.email}</p>

      <button 
        onClick={handleLogout}
        className="btn btn-primary" // Reusing your existing button class
        style={{ maxWidth: '200px', margin: '2rem auto' }}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;