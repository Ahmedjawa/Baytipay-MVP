// server/controllers/ocrController.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createWorker } = require('tesseract.js');

const entityExtractor = require('../services/adaptiveEntityExtractor');
const LocalFileStorageService = require('../services/localFileStorage');
const storage = new LocalFileStorageService();
const imageMiddleware = require('../middlewares/imageMiddleware');
const pythonService = require('../services/pythonBridge');

// Configuration des timeouts
const OCR_TIMEOUT = 60000; // 60 secondes pour l'OCR
const ML_ANALYSIS_TIMEOUT = 30000; // 30 secondes pour l'analyse ML

/**
 * Traiter une image avec OCR avec gestion des timeouts
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.processImage = async (req, res) => {
  let worker = null;
  let ocrTimeoutId = null;
  
  const mergeEntities = (ruleBased, mlBased) => {
    // Si mlBased est null ou undefined, retourner ruleBased
    if (!mlBased) return ruleBased;
    
    const merged = {...ruleBased};
    
    // Vérifier si mlBased est un objet avec une propriété 'entities'
    if (typeof mlBased === 'object' && mlBased.entities) {
      // Format retourné par simple_invoice_parser.py
      if (typeof mlBased.entities === 'object' && !Array.isArray(mlBased.entities)) {
        Object.entries(mlBased.entities).forEach(([key, value]) => {
          if (!merged[key]) {
            merged[key] = [{
              value: value,
              confidence: 0.85,
              source: 'simple_parser'
            }];
          }
        });
      } else {
        // Traitement pour un autre format où 'entities' est un tableau
        Object.entries(mlBased.entities).forEach(([key, values]) => {
          if(!merged[key] || confidenceScore(values) > confidenceScore(merged[key])) {
            merged[key] = values.map(v => ({
              ...v,
              source: 'ml_model'
            }));
          }
        });
      }
    } else if (typeof mlBased === 'object') {
      // Si mlBased est un objet plat (ancien format du simple parser)
      Object.entries(mlBased).forEach(([key, value]) => {
        if (!merged[key]) {
          merged[key] = [{
            value: value,
            confidence: 0.85,
            source: 'simple_parser'
          }];
        }
      });
    }
    
    // Pour le débogage - afficher les entités finales dans la console
    console.log('Entités finales fusionnées:', JSON.stringify(merged));
    
    return merged;
  };

  const confidenceScore = (entityList) => {
    if (!Array.isArray(entityList)) return 0;
    return entityList.reduce((sum, e) => sum + (e.confidence || 0.7), 0);
  };
  
  // Fonction pour nettoyer les ressources
  const cleanup = async () => {
    // Effacer le timeout s'il existe
    if (ocrTimeoutId) clearTimeout(ocrTimeoutId);
    
    // Nettoyer le worker
    if (worker) {
      try {
        await worker.terminate();
        worker = null;
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
  };

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

    // Définir un timeout global pour l'opération OCR
    ocrTimeoutId = setTimeout(() => {
      console.error('Timeout de l\'OCR atteint');
      cleanup();
      if (!res.headersSent) {
        return res.status(408).json({
          success: false,
          message: 'Timeout lors du traitement OCR'
        });
      }
    }, OCR_TIMEOUT);

    // Configuration du worker avec options optimisées
    worker = await createWorker({
      logger: m => console.debug(m), // Réduit la verbosité des logs
      langPath: path.join(__dirname, '../tessdata'),
      gzip: false,
      errorHandler: err => console.error('Tesseract Error:', err)
    });
    
    // Chargement du modèle de langue français
    await worker.loadLanguage('fra');
    await worker.initialize('fra');
    
    // Paramètres optimisés pour la performance
    await worker.setParameters({
      tessedit_ocr_engine_mode: 3, // Mode LSTM optimisé
      tessedit_pageseg_mode: 6,
      preserve_interword_spaces: 0,
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÂÇÉÈÊËÎÏÔÙÛÜàâçéèêëîïôùûü.,/-:€$%&()',
      textord_tabfind_show_vlines: 0
    });
    
    // Reconnaissance de texte avec Tesseract
    console.log(`Processing image: ${req.processedImagePath}`);
    
    // Utiliser une promesse avec race contre un timeout pour l'OCR
    const { data: { text } } = await Promise.race([
      worker.recognize(req.processedImagePath),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OCR Worker Timeout')), OCR_TIMEOUT - 1000)
      )
    ]);
    
    // Extraire les entités importantes avec l'approche à base de règles
    const entities = await entityExtractor.extractEntities(text);
    
    let mlAnalysis = null;
    try {
      // Utiliser un timeout pour l'analyse ML aussi
      mlAnalysis = await Promise.race([
        pythonService.analyzeWithSimpleParser(req.processedImagePath, text),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('ML Analysis Timeout')), ML_ANALYSIS_TIMEOUT)
        )
      ]);
      
      console.log('Simple parser analysis result:', JSON.stringify(mlAnalysis).substring(0, 200) + '...');
    } catch (mlError) {
      console.error('Erreur lors de l\'analyse avec le parser simple:', mlError.message);
      // Continue without ML analysis if it fails
    }

    // Fusion des résultats
    const finalEntities = mergeEntities(entities, mlAnalysis);
    
    // Nettoyer les ressources avant de répondre
    await cleanup();
    
    // Annuler le timeout car nous avons terminé avec succès
    if (ocrTimeoutId) {
      clearTimeout(ocrTimeoutId);
      ocrTimeoutId = null;
    }
    
    res.json({
      success: true,
      text: text.substring(0, 1000), // Limiter la taille du texte retourné
      entities: finalEntities,
      model_version: "simple-parser-1.0"
    });
  } catch (error) {
    console.error('Erreur lors du traitement OCR:', error.message);
    
    // Nettoyer avant de répondre en cas d'erreur
    await cleanup();
    
    // Répondre avec une erreur appropriée
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors du traitement de l\'image',
        error: error.message
      });
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
    const entities = await entityExtractor.extractEntities(text);
    
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