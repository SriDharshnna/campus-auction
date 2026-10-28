import { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_USER } from '../mock/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('campus_auction_user');
      return saved ? JSON.parse(saved) : null; // Unauthenticated by default
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(currentUser));

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('campus_auction_user', JSON.stringify(currentUser));
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('campus_auction_user');
      setIsAuthenticated(false);
    }
  }, [currentUser]);

  const login = (userData) => {
    const user = {
      ...MOCK_USER,
      ...userData,
      name: userData.name || userData.email.split('@')[0],
    };
    setCurrentUser(user);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const toggleAuthForDemo = () => {
    if (currentUser) {
      setCurrentUser(null);
    } else {
      setCurrentUser(MOCK_USER);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, login, logout, toggleAuthForDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
