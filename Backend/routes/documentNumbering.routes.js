const express = require('express');
const router = express.Router();
const documentNumberingController = require('../controllers/documentNumbering.controller');

// Route pour obtenir le prochain numéro de document
router.get('/next-number', documentNumberingController.getNextDocumentNumber);

module.exports = router; 