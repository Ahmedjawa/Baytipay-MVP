// client/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { 
  getAuthToken, 
  setAuthToken, 
  getUserId, 
  getEntrepriseId, 
  getUserRole
} from '../auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Effet pour vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      
      try {
        if (token) {
          // Vérifier le token auprès du serveur
          const response = await apiClient.get('/api/auth/verify');
          
          if (response.data.isValid) {
            setIsAuthenticated(true);
            
            // Mettre à jour les informations utilisateur
            setCurrentUser({
              id: getUserId() || response.data.user?._id,
              entrepriseId: getEntrepriseId() || response.data.user?.entrepriseId,
              role: getUserRole() || response.data.user?.role,
              nom: response.data.user?.nom,
              prenom: response.data.user?.prenom,
              email: response.data.user?.email,
              avatar: response.data.user?.avatar
            });
            
            // S'assurer que les IDs sont bien stockés dans localStorage
            if (response.data.user?._id) {
              localStorage.setItem('userId', response.data.user._id);
            }
            
            if (response.data.user?.entrepriseId) {
              localStorage.setItem('entrepriseId', response.data.user.entrepriseId);
            }
          } else {
            // Token invalide
            logout();
          }
        }
      } catch (error) {
        console.error("Erreur de vérification:", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Fonction de connexion
  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/api/auth/login', credentials);
      
      if (response.data.success && response.data.token) {
        // Stocker le token
        setAuthToken(response.data.token);
        
        // Mettre à jour les informations utilisateur
        const userData = response.data.user;
        setCurrentUser({
          id: userData._id,
          entrepriseId: userData.entrepriseId,
          role: userData.role,
          nom: userData.nom,
          prenom: userData.prenom,
          email: userData.email,
          avatar: userData.avatar
        });
        
        // Sauvegarder les IDs dans localStorage
        localStorage.setItem('userId', userData._id);
        localStorage.setItem('entrepriseId', userData.entrepriseId);
        localStorage.setItem('userRole', userData.role);
        
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Erreur de connexion' 
        };
      }
    } catch (error) {
      console.error("Erreur de login:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Email ou mot de passe incorrect' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    setAuthToken(null); // Cette fonction supprime déjà tous les items du localStorage
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Valeurs exposées par le contexte
  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    logout,
    getUserId: () => currentUser?.id || getUserId(),
    getEntrepriseId: () => currentUser?.entrepriseId || getEntrepriseId(),
    getUserRole: () => currentUser?.role || getUserRole()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};