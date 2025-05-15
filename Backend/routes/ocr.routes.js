const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocr.controller');
const imageMiddleware = require('../middlewares/imageMiddleware');

// Routes pour le traitement OCR
router.post('/process', imageMiddleware.preprocess, ocrController.processImage);
router.post('/detect-type', ocrController.detectDocumentType);
router.post('/extract-entities', ocrController.extractEntities);

module.exports = router;
