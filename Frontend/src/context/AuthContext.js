// client/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Vérifier le token au chargement
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        // Option: Vérifier la validité du token avec le backend
        // Pour l'instant, on considère qu'avoir un token = être authentifié
        setIsAuthenticated(true);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    setIsAuthenticated,
    loading,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};