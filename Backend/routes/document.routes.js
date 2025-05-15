// server/routes/document.routes.js
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth');

/**
 * Routes pour la gestion des documents
 */

// Créer un nouveau document - accessible aux utilisateurs authentifiés
router.post('/', authMiddleware, documentController.saveDocument);

// Récupérer tous les documents - accessible aux utilisateurs authentifiés
router.get('/', authMiddleware, documentController.getAllDocuments);

// Récupérer un document par son ID - accessible aux utilisateurs authentifiés
router.get('/:id', authMiddleware, documentController.getDocumentById);

// Mettre à jour un document - accessible aux utilisateurs authentifiés
router.put('/:id', authMiddleware, documentController.updateDocument);

// Supprimer un document - accessible aux utilisateurs authentifiés
router.delete('/:id', authMiddleware, documentController.deleteDocument);

module.exports = router;