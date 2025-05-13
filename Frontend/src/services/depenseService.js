// ../services/depenseService.js
import apiClient from '../utils/apiClient';

/**
 * Crée une nouvelle dépense
 * @param {Object} depenseData - Données de la dépense à créer
 * @returns {Promise} Promesse contenant la réponse du serveur
 */
export const createDepense = async (depenseData) => {
  try {
    const response = await apiClient.post('/api/depenses', depenseData);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la création de la dépense:", error);
    throw error;
  }
};

/**
 * Récupère toutes les dépenses
 * @param {Object} filters - Filtres optionnels (date début, date fin, catégorie, etc.)
 * @returns {Promise} Promesse contenant la liste des dépenses
 */
export const getDepenses = async (filters = {}) => {
  try {
    const response = await apiClient.get('/api/depenses', { params: filters });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des dépenses:", error);
    throw error;
  }
};

/**
 * Récupère une dépense par son ID
 * @param {string} id - ID de la dépense à récupérer
 * @returns {Promise} Promesse contenant les détails de la dépense
 */
export const getDepenseById = async (id) => {
  try {
    const response = await apiClient.get(`/api/depenses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération de la dépense ${id}:`, error);
    throw error;
  }
};

/**
 * Met à jour une dépense existante
 * @param {string} id - ID de la dépense à mettre à jour
 * @param {Object} depenseData - Nouvelles données de la dépense
 * @returns {Promise} Promesse contenant la réponse du serveur
 */
export const updateDepense = async (id, depenseData) => {
  try {
    const response = await apiClient.put(`/api/depenses/${id}`, depenseData);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de la dépense ${id}:`, error);
    throw error;
  }
};

/**
 * Supprime une dépense
 * @param {string} id - ID de la dépense à supprimer
 * @returns {Promise} Promesse contenant la réponse du serveur
 */
export const deleteDepense = async (id) => {
  try {
    const response = await apiClient.delete(`/api/depenses/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la suppression de la dépense ${id}:`, error);
    throw error;
  }
};

/**
 * Change le statut de paiement d'une dépense
 * @param {string} id - ID de la dépense
 * @param {Object} paiementData - Données de paiement (statut, date, référence, etc.)
 * @returns {Promise} Promesse contenant la réponse du serveur
 */
export const updatePaiementStatus = async (id, paiementData) => {
  try {
    const response = await apiClient.patch(`/api/depenses/${id}/paiement`, paiementData);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du statut de paiement pour la dépense ${id}:`, error);
    throw error;
  }
};

/**
 * Ajoute un justificatif à une dépense
 * @param {string} depenseId - ID de la dépense
 * @param {FormData} formData - Données du fichier (formData contenant le fichier)
 * @returns {Promise} Promesse contenant la réponse du serveur
 */
export const addJustificatif = async (depenseId, formData) => {
  try {
    const response = await apiClient.post(`/api/depenses/${depenseId}/justificatifs`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'ajout du justificatif pour la dépense ${depenseId}:`, error);
    throw error;
  }
};

/**
 * Supprime un justificatif d'une dépense
 * @param {string} depenseId - ID de la dépense
 * @param {string} justificatifId - ID du justificatif à supprimer
 * @returns {Promise} Promesse contenant la réponse du serveur
 */
export const deleteJustificatif = async (depenseId, justificatifId) => {
  try {
    const response = await apiClient.delete(`/api/depenses/${depenseId}/justificatifs/${justificatifId}`);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la suppression du justificatif ${justificatifId}:`, error);
    throw error;
  }
};

/**
 * Récupère le résumé des dépenses (pour tableaux de bord)
 * @param {Object} params - Paramètres de la requête (période, groupement, etc.)
 * @returns {Promise} Promesse contenant les données de résumé
 */
export const getDepensesResume = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/depenses/resume', { params });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du résumé des dépenses:", error);
    throw error;
  }
};

/**
 * Exporte les dépenses en format CSV ou Excel
 * @param {Object} filters - Filtres pour les dépenses à exporter
 * @param {string} format - Format d'export ('csv' ou 'excel')
 * @returns {Promise} Promesse contenant les données à télécharger
 */
export const exportDepenses = async (filters = {}, format = 'csv') => {
  try {
    const response = await apiClient.get(`/api/depenses/export/${format}`, { 
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de l'export des dépenses en ${format}:`, error);
    throw error;
  }
};