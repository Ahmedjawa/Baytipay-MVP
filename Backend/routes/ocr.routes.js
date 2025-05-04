const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocr.controller');

router.post('/scan', ocrController.scanDocument);

module.exports = router;
