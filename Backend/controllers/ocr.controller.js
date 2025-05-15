// server/controllers/ocrController.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createWorker } = require('tesseract.js');

const entityExtractor = require('../services/entityExtractor');
const LocalFileStorageService = require('../services/localFileStorage');
const storage = new LocalFileStorageService();
const imageMiddleware = require('../middlewares/imageMiddleware');

/**
 * Traiter une image avec OCR
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.processImage = async (req, res) => {
  let worker = null;
  
  try {
    if (!req.processedImagePath) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image traitée'
      });
    }

    // Vérifier que le fichier existe
    if (!fs.existsSync(req.processedImagePath)) {
      return res.status(400).json({
        success: false,
        message: 'Le fichier image n\'existe pas'
      });
    }

    // Configuration du worker avec options spécifiques
    worker = await createWorker({
      logger: m => console.log(m),
      langPath: path.join(__dirname, '../tessdata'), // Spécifier le chemin des données de langue
      gzip: false, // Désactiver gzip pour éviter les problèmes de décompression
      errorHandler: err => console.error('Tesseract Error:', err)
    });
    
    // Chargement explicite du modèle de langue français
    await worker.loadLanguage('fra');
    await worker.initialize('fra');
    
    // Appliquer les meilleurs paramètres pour l'OCR
    await worker.setParameters({
      tessedit_ocr_engine_mode: 1, // Mode complet (plus précis)
      tessedit_pageseg_mode: 6, // Segmentation par bloc uniforme (pour les factures)
      preserve_interword_spaces: 1, // Préserver les espaces entre les mots
    });
    
    // Reconnaissance de texte avec Tesseract
    console.log(`Processing image: ${req.processedImagePath}`);
    const { data: { text } } = await worker.recognize(req.processedImagePath);
    
    // Extraire les entités importantes
    const entities = await entityExtractor.extractEntities(text);
    
    res.json({
      success: true,
      text: text,
      entities: entities
    });
  } catch (error) {
    console.error('Erreur lors du traitement OCR:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement de l\'image',
      error: error.message
    });
  } finally {
    // Nettoyer le worker
    if (worker) {
      try {
        await worker.terminate();
      } catch (err) {
        console.error('Erreur lors de la terminaison du worker:', err);
      }
    }
    
    // Nettoyer le fichier temporaire
    try {
      if (req.processedImagePath && fs.existsSync(req.processedImagePath)) {
        await imageMiddleware.cleanup(req.processedImagePath);
      }
    } catch (err) {
      console.error('Erreur lors du nettoyage du fichier temporaire:', err);
    }
  }
};

/**
 * Détecter le type de document
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.detectDocumentType = async (req, res) => {
  try {
    if (!req.body.text) {
      return res.status(400).json({
        success: false,
        message: 'Aucun texte fourni'
      });
    }

    const text = req.body.text;
    const documentType = entityExtractor.detectDocumentType(text);
    
    res.json({
      success: true,
      type: documentType
    });
  } catch (error) {
    console.error('Erreur lors de la détection du type de document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la détection du type de document'
    });
  }
};

/**
 * Extraire les entités d'un texte
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.extractEntities = async (req, res) => {
  try {
    if (!req.body.text) {
      return res.status(400).json({
        success: false,
        message: 'Aucun texte fourni'
      });
    }

    const text = req.body.text;
    const entities = entityExtractor.extractFromText(text);
    
    res.json({
      success: true,
      entities: entities
    });
  } catch (error) {
    console.error('Erreur lors de l\'extraction des entités:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'extraction des entités'
    });
  }
};