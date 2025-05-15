// server/controllers/fileController.js
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);
const LocalFileStorageService = require('../services/localFileStorage');
const config = require('../config/storage.config');

// Initialiser le service de stockage avec la configuration
const storageService = new LocalFileStorageService({
  baseDir: config.local.baseDir,
  allowedTypes: config.local.allowedTypes,
  maxFileSize: config.local.maxFileSize,
  createThumbnails: config.local.createThumbnails
});

// Initialiser le service au démarrage
(async () => {
  try {
    await storageService.initialize();
    console.log('Service de stockage de fichiers initialisé');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du service de stockage:', error);
  }
})();

/**
 * Télécharger un fichier (upload)
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.uploadFile = async (req, res) => {
  try {
    // Vérifier si un fichier est présent dans la requête
    if (!req.file && !req.body.fileData) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    let fileInfo;

    // Traiter le fichier selon le type de données reçues
    if (req.file) {
      // Fichier provenant de multer
      const buffer = await readFileAsync(req.file.path);
      fileInfo = await storageService.saveBufferFile(
        buffer,
        req.file.originalname,
        req.file.mimetype,
        req.body.documentType || 'document',
        req.user ? req.user.id : null
      );

      // Supprimer le fichier temporaire de multer
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Erreur lors de la suppression du fichier temporaire:', err);
      });
    } else if (req.body.fileData) {
      // Données base64
      fileInfo = await storageService.saveBase64File(
        req.body.fileData,
        req.body.fileName || 'document.jpg',
        req.body.documentType || 'document',
        req.user ? req.user.id : null
      );
    }

    res.status(201).json({
      success: true,
      message: 'Fichier téléchargé avec succès',
      file: {
        filename: fileInfo.filename,
        originalname: fileInfo.originalname,
        path: fileInfo.path,
        url: fileInfo.url,
        thumbnailUrl: fileInfo.thumbnailUrl,
        size: fileInfo.size,
        mimetype: fileInfo.mimetype
      }
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléchargement du fichier',
      error: error.message
    });
  }
};

/**
 * Récupérer un fichier
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getFile = async (req, res) => {
  try {
    const filePath = req.params.path;
    
    // Sécurité: vérifier que le chemin ne contient pas de ".."
    if (filePath.includes('..')) {
      return res.status(403).json({
        success: false,
        message: 'Chemin de fichier non autorisé'
      });
    }

    // Récupérer le fichier
    const fileBuffer = await storageService.getFile(filePath);
    const fileInfo = await storageService.getFileInfo(filePath);
    
    // Déterminer le type MIME
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream'; // Type par défaut
    
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.doc' || ext === '.docx') contentType = 'application/msword';
    else if (ext === '.xls' || ext === '.xlsx') contentType = 'application/vnd.ms-excel';
    
    // Envoyer le fichier
    res.set({
      'Content-Type': contentType,
      'Content-Length': fileInfo.size,
      'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
      'Cache-Control': 'max-age=86400' // Cache 24h
    });
    
    res.send(fileBuffer);
  } catch (error) {
    console.error('Erreur lors de la récupération du fichier:', error);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du fichier',
      error: error.message
    });
  }
};

/**
 * Supprimer un fichier
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.deleteFile = async (req, res) => {
  try {
    const filePath = req.params.path;
    
    // Sécurité: vérifier que le chemin ne contient pas de ".."
    if (filePath.includes('..')) {
      return res.status(403).json({
        success: false,
        message: 'Chemin de fichier non autorisé'
      });
    }
    
    const result = await storageService.deleteFile(filePath);
    
    if (result) {
      res.json({
        success: true,
        message: 'Fichier supprimé avec succès'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du fichier',
      error: error.message
    });
  }
};

/**
 * Lister les fichiers d'un répertoire
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.listFiles = async (req, res) => {
  try {
    const directory = req.params.directory || 'documents';
    
    // Sécurité: vérifier que le chemin ne contient pas de ".."
    if (directory.includes('..')) {
      return res.status(403).json({
        success: false,
        message: 'Chemin de répertoire non autorisé'
      });
    }
    
    const files = await storageService.listFiles(directory);
    
    res.json({
      success: true,
      count: files.length,
      files
    });
  } catch (error) {
    console.error('Erreur lors du listage des fichiers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du listage des fichiers',
      error: error.message
    });
  }
};

/**
 * Obtenir les informations d'un fichier
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getFileInfo = async (req, res) => {
  try {
    const filePath = req.params.path;
    
    // Sécurité: vérifier que le chemin ne contient pas de ".."
    if (filePath.includes('..')) {
      return res.status(403).json({
        success: false,
        message: 'Chemin de fichier non autorisé'
      });
    }
    
    const fileInfo = await storageService.getFileInfo(filePath);
    
    res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du fichier:', error);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des informations du fichier',
      error: error.message
    });
  }
};

/**
 * Nettoyer les fichiers temporaires
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.cleanupTempFiles = async (req, res) => {
  try {
    // Cette route ne devrait être accessible qu'aux administrateurs
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    const maxAge = req.query.maxAge ? parseInt(req.query.maxAge) : 3600000; // 1 heure par défaut
    await storageService.cleanupTempFiles(maxAge);
    
    res.json({
      success: true,
      message: 'Nettoyage des fichiers temporaires effectué avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage des fichiers temporaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du nettoyage des fichiers temporaires',
      error: error.message
    });
  }
};