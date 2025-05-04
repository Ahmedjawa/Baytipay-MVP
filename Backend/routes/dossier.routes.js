const express = require('express');
const router = express.Router();
const dossierController = require('../controllers/dossier.controller');

router.get('/', dossierController.getAll);
router.post('/', dossierController.create);

module.exports = router;
