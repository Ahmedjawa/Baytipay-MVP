import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const validateUserData = (userData) => {
    console.log('Validation des données utilisateur:', userData);
    
    if (!userData) {
      console.error('Données utilisateur manquantes');
      return false;
    }
    
    // Vérifier si nous avons un ID utilisateur (soit id, soit userId)
    if (!userData.id && !userData.userId) {
      console.error('ID utilisateur manquant. Données reçues:', userData);
      return false;
    }
    
    // Vérifier l'ID entreprise
    if (!userData.entrepriseId) {
      console.error('ID entreprise manquant. Données reçues:', userData);
      return false;
    }
    
    // Vérifier si l'ID entreprise est un objet MongoDB
    if (typeof userData.entrepriseId === 'object' && userData.entrepriseId._id) {
      console.log('Conversion de l\'ID entreprise objet en chaîne');
      userData.entrepriseId = userData.entrepriseId._id;
    }
    
    console.log('Données utilisateur valides:', userData);
    return true;
  };

  const normalizeUserData = (userData) => {
    console.log('Normalisation des données utilisateur:', userData);
    
    // Créer une copie des données pour éviter de modifier l'original
    const normalizedData = { ...userData };
    
    // Gérer l'ID utilisateur
    if (normalizedData._id && !normalizedData.id && !normalizedData.userId) {
      normalizedData.id = normalizedData._id;
      normalizedData.userId = normalizedData._id;
      console.log('ID utilisateur normalisé depuis _id:', normalizedData.id);
    }
    
    // S'assurer que nous avons toujours un champ 'id'
    if (normalizedData.userId && !normalizedData.id) {
      normalizedData.id = normalizedData.userId;
      console.log('ID utilisateur normalisé depuis userId:', normalizedData.id);
    }
    
    // Gérer l'ID entreprise
    if (normalizedData.entrepriseId) {
      if (typeof normalizedData.entrepriseId === 'object') {
        if (normalizedData.entrepriseId._id) {
          normalizedData.entrepriseId = normalizedData.entrepriseId._id;
        } else {
          normalizedData.entrepriseId = normalizedData.entrepriseId.toString();
        }
        console.log('ID entreprise normalisé:', normalizedData.entrepriseId);
      }
    }
    
    console.log('Données utilisateur normalisées:', normalizedData);
    return normalizedData;
  };

  const storeUserData = (userData) => {
    console.log('Stockage des données utilisateur:', userData);
    
    const normalizedData = normalizeUserData(userData);
    if (!validateUserData(normalizedData)) {
      console.error('Données utilisateur invalides après normalisation:', normalizedData);
      throw new Error('Données utilisateur invalides');
    }
    
    localStorage.setItem('user', JSON.stringify(normalizedData));
    setUser(normalizedData);
    console.log('Données utilisateur stockées avec succès');
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log('Initialisation de l\'authentification:', { token: !!token, storedUser: !!storedUser });
        
        if (token && storedUser) {
          try {
            // Vérifier la validité du token
            const response = await apiClient.get('/api/auth/verify');
            console.log('Réponse de vérification du token:', response.data);
            
            if (response.data.success && response.data.isValid) {
              const parsedUser = JSON.parse(storedUser);
              console.log('Utilisateur parsé:', parsedUser);
              
              const normalizedUser = normalizeUserData(parsedUser);
              if (validateUserData(normalizedUser)) {
                storeUserData(normalizedUser);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
              } else {
                console.error('Données utilisateur invalides lors de l\'initialisation');
                handleLogout();
              }
            } else {
              console.error('Token invalide');
              handleLogout();
            }
          } catch (error) {
            console.error('Erreur lors de la vérification du token:', error);
            handleLogout();
          }
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleLogout = () => {
    console.log('Déconnexion de l\'utilisateur');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('entrepriseId');
    localStorage.removeItem('userRole');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/login?session_expired=true';
  };

  const login = async (credentials) => {
    try {
      console.log('Tentative de connexion avec les identifiants:', credentials);
      
      const response = await apiClient.post('/api/auth/login', credentials);
      console.log('Réponse brute du serveur:', response);
      console.log('Données de la réponse:', response.data);
      
      const { token, user: userData } = response.data;
      
      // Vérifier la structure des données reçues
      console.log('Token reçu:', token);
      console.log('Données utilisateur reçues:', userData);
      
      if (!userData) {
        console.error('Aucune donnée utilisateur reçue du serveur');
        throw new Error('Erreur de connexion: données utilisateur manquantes');
      }
      
      // Normaliser les données utilisateur avant la validation
      const normalizedUserData = normalizeUserData(userData);
      console.log('Données utilisateur normalisées après connexion:', normalizedUserData);
      
      if (!validateUserData(normalizedUserData)) {
        console.error('Données utilisateur invalides après connexion:', normalizedUserData);
        throw new Error('Les données utilisateur reçues sont incomplètes');
      }
      
      // Stocker le token et les données utilisateur
      localStorage.setItem('token', token);
      storeUserData(normalizedUserData);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true };
    } catch (error) {
      console.error('Erreur détaillée de connexion:', error);
      console.error('Réponse d\'erreur:', error.response?.data);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Erreur lors de la connexion'
      };
    }
  };

  const logout = handleLogout;

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 