const express = require('express');
const router = express.Router();
const echeanceController = require('../controllers/echeance.controller');

// Obtenir toutes les échéances
router.get('/', echeanceController.getAll);

// Créer une nouvelle échéance
router.post('/', echeanceController.create);

// Mettre à jour une échéance
router.put('/:id', echeanceController.update);

// Supprimer une échéance
router.delete('/:id', echeanceController.remove);

module.exports = router;
