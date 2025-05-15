// server/routes/file.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middlewares/auth');

// Configuration de multer pour le téléchargement de fichiers
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/temp'));
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

// Filtrer les types de fichiers autorisés
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

/**
 * Routes pour la gestion des fichiers
 */

// Télécharger un fichier - accessible à tous les utilisateurs authentifiés
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);

// Récupérer un fichier - accessible à tous
router.get('/get/:path(*)', fileController.getFile);

// Récupérer les informations d'un fichier - accessible aux utilisateurs authentifiés
router.get('/info/:path(*)', authMiddleware, fileController.getFileInfo);

// Supprimer un fichier - accessible aux utilisateurs authentifiés
router.delete('/delete/:path(*)', authMiddleware, fileController.deleteFile);

// Lister les fichiers d'un répertoire - accessible aux utilisateurs authentifiés
router.get('/list/:directory?', authMiddleware, fileController.listFiles);

// Nettoyer les fichiers temporaires - accessible uniquement aux administrateurs
router.post('/cleanup-temp', authMiddleware, fileController.cleanupTempFiles);

module.exports = router;