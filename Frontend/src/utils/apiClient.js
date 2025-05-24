// client/src/utils/apiClient.js
import axios from 'axios';
import { logout } from '../auth';

// Configuration de base
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  timeout: 500000, // 30 secondes de timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Routes OCR
apiClient.ocr = {
  process: '/api/ocr/process',
  detectType: '/api/ocr/detect-type',
  extractEntities: '/api/ocr/extract-entities'
};

// Intercepteur de requête
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ajout d'un timestamp pour éviter le cache navigateur
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Gestion spécifique des erreurs 401
    if (error.response?.status === 401) {
      // Vérifier si c'est une erreur de token expiré
      if (error.response.data?.message?.includes('token') || 
          error.response.data?.message?.includes('session')) {
        // Nettoyer le localStorage et rediriger vers la page de login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('entrepriseId');
        localStorage.removeItem('userRole');
        delete apiClient.defaults.headers.common['Authorization'];
        
        // Rediriger vers la page de login avec un message
        window.location.href = '/login?session_expired=true';
        return Promise.reject(error);
      }
    }

    // Gestion des erreurs réseau
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout - Le serveur ne répond pas');
    }

    return Promise.reject(error);
  }
);

export default apiClient;