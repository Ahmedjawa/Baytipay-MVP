// client/src/auth.js
import apiClient from './utils/apiClient';

export const login = async (credentials) => {
  try {
    const response = await apiClient.post('/api/auth/login', credentials);
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error("Erreur de login:", error);
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
      setAuthToken(response.data.token);
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
  } else {
    localStorage.removeItem('token');
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
  setAuthToken(null);
};