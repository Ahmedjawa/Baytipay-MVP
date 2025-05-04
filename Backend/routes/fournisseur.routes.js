const express = require('express');
const router = express.Router();
const fournisseurController = require('../controllers/fournisseur.controller');

// Correction : utilisez getAllFournisseurs et createFournisseur
router.get('/', fournisseurController.getAllFournisseurs);
router.post('/', fournisseurController.createFournisseur);

module.exports = router;