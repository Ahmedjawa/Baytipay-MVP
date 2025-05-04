import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
});

// Intercepteur pour logs de débogage
api.interceptors.request.use(config => {
  console.log('Envoi requête :', config.method, config.url, config.data);
  return config;
});

api.interceptors.response.use(response => {
  console.log('Réponse reçue :', response.config.url, response.data);
  return response;
}, error => {
  console.error('Erreur API :', error.response?.data);
  return Promise.reject(error);
});

export default api;