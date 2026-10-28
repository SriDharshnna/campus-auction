import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('campus_auction_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(currentUser));
  const [initializing, setInitializing] = useState(true);

  // Restore authenticated session from backend on mount or page refresh
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('campus_auction_token');
        if (token || document.cookie.includes('token')) {
          const data = await api.getMe();
          if (isMounted && data?.user) {
            setCurrentUser(data.user);
            setIsAuthenticated(true);
            localStorage.setItem('campus_auction_user', JSON.stringify(data.user));
          }
        } else {
          if (isMounted) {
            setCurrentUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('campus_auction_user');
          }
        }
      } catch (err) {
        // Token invalid or expired
        if (isMounted) {
          setCurrentUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem('campus_auction_user');
          localStorage.removeItem('campus_auction_token');
        }
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials) => {
    const data = await api.login(credentials);
    if (data.token) {
      localStorage.setItem('campus_auction_token', data.token);
    }
    if (data.user) {
      localStorage.setItem('campus_auction_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsAuthenticated(true);
    }
    return data;
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    return data;
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem('campus_auction_token');
      localStorage.removeItem('campus_auction_user');
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        initializing,
        login,
        register,
        logout
      }}
    >
      {initializing ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner-ring" />
        </div>
      ) : (
        children
      )}
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
