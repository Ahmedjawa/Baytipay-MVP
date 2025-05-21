// Amélioration du service OCR - client/src/utils/ocrService.js

import apiClient from './apiClient';

/**
 * Service pour traiter les images et extraire du texte via OCR
 * Gère l'interaction avec l'API d'OCR
 */
class OCRService {
  /**
   * Envoie une image pour analyse OCR et extraction de données
   * 
   * @param {string} imageData - Image encodée en base64
   * @param {Object} options - Options de prétraitement
   * @returns {Promise} - Promesse contenant les données extraites
   */
  async processImage(imageData, options = {}) {
    try {
      // Enlever l'en-tête de données si présent (ex: data:image/jpeg;base64,)
      const base64Data = imageData.includes('base64,') 
        ? imageData.split('base64,')[1] 
        : imageData;
      
      const response = await apiClient.post(apiClient.ocr.process, {
        image: base64Data,
        options: options
      });
      
      // Normaliser la structure de la réponse
      return this.normalizeOCRResponse(response.data);
    } catch (error) {
      console.error("Erreur lors du traitement OCR:", error);
      throw error;
    }
  }
  
  /**
   * Normalise la structure de la réponse de l'API OCR
   * pour garantir un format constant quelle que soit la source
   * 
   * @param {Object} responseData - Les données brutes retournées par l'API
   * @returns {Object} - La réponse normalisée
   */
  normalizeOCRResponse(responseData) {
    // Si la réponse est déjà dans le format attendu, la retourner telle quelle
    if (responseData.entities) {
      return responseData;
    }
    
    // Si la réponse contient raw_results, l'utiliser comme source
    if (responseData.raw_results) {
      return {
        text: responseData.text || '',
        entities: this.convertToEntitiesFormat(responseData.raw_results),
        model_version: responseData.model_version || 'unknown'
      };
    }
    
    // Cas où nous n'avons que la réponse success et le texte
    if (responseData.success && responseData.text) {
      return {
        text: responseData.text,
        entities: {},
        model_version: responseData.model_version || 'unknown'
      };
    }
    
    // Dernière option - retourner tel quel
    return responseData;
  }
  
  /**
   * Convertit un objet plat de résultats en format d'entités structuré
   * 
   * @param {Object} rawResults - Les résultats bruts extraits
   * @returns {Object} - Format d'entités structuré
   */
  convertToEntitiesFormat(rawResults) {
    const entities = {};
    
    // Vérifier si rawResults est un objet valide
    if (!rawResults || typeof rawResults !== 'object') {
      return entities;
    }
    
    // Convertir chaque élément en tableau d'entités
    Object.entries(rawResults).forEach(([key, value]) => {
      // Si la valeur est déjà un tableau d'objets avec la structure attendue
      if (Array.isArray(value) && value.length > 0 && value[0].value !== undefined) {
        entities[key] = value;
      } 
      // Si la valeur est une chaîne ou un nombre
      else if (typeof value === 'string' || typeof value === 'number') {
        entities[key] = [{
          value: value.toString(),
          confidence: 0.85, // Confiance par défaut
          source: 'ocr_service'
        }];
      }
    });
    
    return entities;
  }
  
  /**
   * Détecte le type de document (facture, reçu, etc.)
   * 
   * @param {string} text - Texte extrait du document
   * @returns {Promise} - Promesse contenant le type de document détecté
   */
  async detectDocumentType(text) {
    try {
      const response = await apiClient.post(apiClient.ocr.detectType, {
        text
      });
      
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la détection du type de document:", error);
      // Retourner un type par défaut en cas d'erreur
      return { type: 'unknown', success: false };
    }
  }
  
  /**
   * Extraire les entités spécifiques comme les montants, dates, etc.
   * 
   * @param {string} text - Texte extrait du document
   * @returns {Promise} - Promesse contenant les entités extraites
   */
  async extractEntities(text) {
    try {
      const response = await apiClient.post(apiClient.ocr.extractEntities, {
        text
      });
      
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'extraction des entités:", error);
      throw error;
    }
  }
  
  /**
   * Enregistrer un document scanné avec les métadonnées associées
   * 
   * @param {object} documentData - Données du document et métadonnées
   * @returns {Promise} - Promesse contenant le résultat de l'enregistrement
   */
  async saveDocument(documentData) {
    try {
      const response = await apiClient.post('/api/documents', documentData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du document:", error);
      throw error;
    }
  }
}

export default new OCRService();