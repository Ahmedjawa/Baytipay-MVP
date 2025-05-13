// routes/facture.routes.js
const express = require('express');
const router = express.Router();
const factureController = require('../controllers/facture.controller');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/vente/:venteId', factureController.getByVente);
router.post('/:id/envoyer-email', factureController.envoyerEmail);
router.get('/:id/pdf', factureController.genererPDF);

module.exports = router;