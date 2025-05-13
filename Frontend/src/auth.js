// client/src/auth.js
import apiClient from './utils/apiClient';
import { jwtDecode } from 'jwt-decode'; // Importation nommée au lieu de l'importation par défaut

export const login = async (credentials) => {
  try {
    const response = await apiClient.post('/api/auth/login', credentials);
    if (response.data && response.data.token) {
      // Stocker le token
      setAuthToken(response.data.token);
      
      // Décoder le token pour extraire les informations utilisateur
      const decodedToken = jwtDecode(response.data.token);
      
      // Stocker l'ID de l'utilisateur et de l'entreprise dans le localStorage
      if (decodedToken.userId) {
        localStorage.setItem('userId', decodedToken.userId);
      }
      
      if (decodedToken.entrepriseId) {
        localStorage.setItem('entrepriseId', decodedToken.entrepriseId);
      }
      
      if (decodedToken.role) {
        localStorage.setItem('userRole', decodedToken.role);
      }
      
      // Si les informations utilisateur sont incluses dans la réponse
      if (response.data.user) {
        localStorage.setItem('userId', response.data.user._id);
        localStorage.setItem('entrepriseId', response.data.user.entrepriseId);
        localStorage.setItem('userRole', response.data.user.role);
      }
    }
    
    // Retourner directement la réponse du serveur
    return response.data;
  } catch (error) {
    console.error("Erreur de login détaillée:", error);
    
    // Retourner un objet structuré même en cas d'erreur
    return {
      success: false,
      message: error.response?.data?.message || 'Email ou mot de passe incorrect'
    };
  }
};

export const register = async (userData) => {
  try {
    const response = await apiClient.post('/api/auth/register', userData);
    if (response.data.token) {
      // Stocker le token
      setAuthToken(response.data.token);
      
      // Décoder le token pour extraire les informations utilisateur
      const decodedToken = jwtDecode(response.data.token);
      
      // Stocker l'ID de l'utilisateur et de l'entreprise dans le localStorage
      if (decodedToken.userId) {
        localStorage.setItem('userId', decodedToken.userId);
      }
      
      if (decodedToken.entrepriseId) {
        localStorage.setItem('entrepriseId', decodedToken.entrepriseId);
      }
      
      // Si les informations utilisateur sont incluses dans la réponse
      if (response.data.user) {
        localStorage.setItem('userId', response.data.user._id);
        localStorage.setItem('entrepriseId', response.data.user.entrepriseId);
        localStorage.setItem('userRole', response.data.user.role);
      }
    }
    return response.data;
  } catch (error) {
    console.error("Erreur d'inscription:", error);
    return {
      success: false,
      message: error.response?.data?.message || 'Erreur lors de la création du compte'
    };
  }
};

// Gestion du token JWT
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Stocker également la date d'expiration
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        localStorage.setItem('tokenExpiration', payload.exp * 1000); // Convertir en millisecondes
      }
    } catch (e) {
      console.error('Erreur lors du décodage du token:', e);
    }
  } else {
    // Supprimer toutes les données d'authentification
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('entrepriseId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('tokenExpiration');
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const isTokenValid = () => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch (e) {
    return false;
  }
};

export const logout = () => {
  setAuthToken(null); // Cela supprimera également userId et entrepriseId
};

// Nouvelles fonctions utilitaires pour récupérer les informations d'authentification
export const getUserId = () => {
  return localStorage.getItem('userId');
};

export const getEntrepriseId = () => {
  return localStorage.getItem('entrepriseId');
};

export const getUserRole = () => {
  return localStorage.getItem('userRole');
};