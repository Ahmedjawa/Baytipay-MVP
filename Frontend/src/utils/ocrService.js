// client/src/utils/ocrService.js
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
      
      return response.data;
    } catch (error) {
      console.error("Erreur lors du traitement OCR:", error);
      throw error;
    }
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
      throw error;
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