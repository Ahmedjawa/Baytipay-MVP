const express = require('express');
const router = express.Router();
const entrepriseController = require('../controllers/entreprise.controller');
const authMiddleware = require('../middlewares/auth');

// Route publique
router.get('/', entrepriseController.getAllEntreprises);

// Routes protégées
router.use(authMiddleware);
router.post('/', entrepriseController.createOrUpdateEntreprise);
router.put('/:id', entrepriseController.createOrUpdateEntreprise);
router.get('/:id', entrepriseController.getEntrepriseById);

module.exports = router;