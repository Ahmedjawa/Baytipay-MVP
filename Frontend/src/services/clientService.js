// services/clientService.js
import apiClient from '../utils/apiClient';

export const clientService = {
  // Récupérer tous les clients
  getAllClients: () => apiClient.get('/api/clients'),
  
  // Récupérer un client par son ID
  getClientById: (id) => apiClient.get(`/api/clients/${id}`),
  
  // Créer un nouveau client
  createClient: (clientData) => apiClient.post('/api/clients', clientData),
  
  // Mettre à jour un client
  updateClient: (id, clientData) => apiClient.put(`/api/clients/${id}`, clientData),
  
  // Supprimer un client
  deleteClient: (id) => apiClient.delete(`/api/clients/${id}`),
  
  // Rechercher des clients
  searchClients: (query) => apiClient.get(`/api/clients/search?q=${encodeURIComponent(query)}`)
};