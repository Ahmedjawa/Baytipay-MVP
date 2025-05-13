// routes/document.routes.js
const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/:entityType/:entityId', documentController.getDocumentsByEntity);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;