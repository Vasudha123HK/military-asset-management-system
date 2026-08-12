import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('military_asset_token');
      const storedUser = localStorage.getItem('military_asset_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Asynchronously verify/refresh profile from server
        try {
          const res = await api.get('/auth/me');
          const freshUser = res.data;
          setUser(freshUser);
          localStorage.setItem('military_asset_user', JSON.stringify(freshUser));
        } catch (error) {
          console.error('Failed to verify active authentication session:', error.message);
          // Token is likely invalid or expired
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token: receivedToken, user: receivedUser } = res.data;
      
      setToken(receivedToken);
      setUser(receivedUser);
      localStorage.setItem('military_asset_token', receivedToken);
      localStorage.setItem('military_asset_user', JSON.stringify(receivedUser));
      return { success: true };
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Invalid credentials or connection error.';
      return { success: false, error: errMsg };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('military_asset_token');
    localStorage.removeItem('military_asset_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
