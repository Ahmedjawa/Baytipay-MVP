// services/articleService.js
import apiClient from '../utils/apiClient';

export const articleService = {
  // Récupérer tous les articles
  getAllArticles: () => apiClient.get('/api/articles'),
  
  // Récupérer un article par son ID
  getArticleById: (id) => apiClient.get(`/api/articles/${id}`),
  
  // Créer un nouveau article
  createArticle: (articleData) => apiClient.post('/api/articles', articleData),
  
  // Mettre à jour un article
  updateArticle: (id, articleData) => apiClient.put(`/api/articles/${id}`, articleData),
  
  // Supprimer un article
  deleteArticle: (id) => apiClient.delete(`/api/articles/${id}`),
  
  // Rechercher des articles
  searchArticles: (query) => apiClient.get(`/api/articles/search?q=${encodeURIComponent(query)}`),
  
  // Récupérer les articles par type
  getArticlesByType: (type) => apiClient.get(`/api/articles?type=${type}`)
};