const express = require('express');
const router = express.Router();
const depenseController = require('../controllers/depense.controller');

// Créer une dépense
router.post('/', depenseController.createDepense);

// Obtenir toutes les dépenses
router.get('/', depenseController.getDepenses);

// Obtenir une dépense par ID
router.get('/:id', depenseController.getDepenseById);

// Mettre à jour une dépense
router.put('/:id', depenseController.updateDepense);

// Supprimer une dépense
router.delete('/:id', depenseController.deleteDepense);

module.exports = router;
