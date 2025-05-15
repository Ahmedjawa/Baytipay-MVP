// server/middleware/imageMiddleware.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware pour traiter les images avant l'OCR
 * Optimise les images pour améliorer les résultats de reconnaissance
 */
const imageMiddleware = {
  /**
   * Traite une image base64 et la prépare pour l'OCR
   * 
   * @param {string} base64Image - Image encodée en base64
   * @param {Object} options - Options de prétraitement
   * @returns {Promise<string>} - Chemin vers l'image traitée
   */
  async processImage(base64Image, options = {}) {
    try {
      // Extraire les données de l'image
      const base64Data = base64Image.includes('base64,') 
        ? base64Image.split('base64,')[1] 
        : base64Image;
      
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Créer une instance Sharp
      let image = sharp(imageBuffer);

      // Configuration par défaut
      const defaultOptions = {
        width: 1500,
        height: 2000,
        grayscale: true,
        normalize: true,
        sharpen: true,
        threshold: true,
        thresholdValue: 128,
        quality: 100
      };

      // Fusionner les options par défaut avec les options fournies
      const processingOptions = { ...defaultOptions, ...options };

      // Appliquer les options de redimensionnement
      if (processingOptions.width || processingOptions.height) {
        image = image.resize(processingOptions.width, processingOptions.height, { fit: 'inside' });
      }

      // Convertir en niveaux de gris si nécessaire
      if (processingOptions.grayscale) {
        image = image.grayscale();
      }

      // Normaliser l'image pour améliorer le contraste
      if (processingOptions.normalize) {
        image = image.normalize();
      }

      // Appliquer un seuil pour binariser l'image si nécessaire
      if (processingOptions.threshold) {
        image = image.threshold(processingOptions.thresholdValue);
      }

      // Ajuster la qualité
      image = image.jpeg({ quality: processingOptions.quality });

      // Générer un nom de fichier unique
      const fileName = `${uuidv4()}.jpg`;
      const tempDir = path.join(__dirname, '../temp');
      const filePath = path.join(tempDir, fileName);

      // Créer le répertoire temporaire s'il n'existe pas
      await fsp.mkdir(tempDir, { recursive: true });

      // Sauvegarder l'image traitée
      await image.toFile(filePath);

      return filePath;
    } catch (error) {
      console.error('Erreur lors du prétraitement de l\'image:', error);
      throw error;
    }
  },

  /**
   * Middleware Express pour prétraiter les images avant l'OCR
   */
  preprocess: async (req, res, next) => {
    try {
      // Vérifier que l'image est bien fournie
      if (!req.body.image) {
        return res.status(400).json({
          success: false,
          message: 'Aucune image fournie'
        });
      }

      // Extraire les options de prétraitement
      const options = req.body.options || {};

      // Prétraiter l'image
      const processedImagePath = await imageMiddleware.processImage(req.body.image, options);

      // Stocker le chemin de l'image traitée dans la requête
      req.processedImagePath = processedImagePath;

      next();
    } catch (error) {
      console.error('Erreur dans le middleware d\'image:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors du prétraitement de l\'image'
      });
    }
  },

  /**
   * Nettoie les fichiers temporaires
   * 
   * @param {string} filePath - Chemin vers le fichier à supprimer
   */
  cleanup: async (filePath) => {
    try {
      if (filePath && fs.existsSync(filePath)) {
        await fsp.unlink(filePath);
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  }
};

module.exports = imageMiddleware;