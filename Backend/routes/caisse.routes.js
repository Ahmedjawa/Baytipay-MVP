// routes/caisse.routes.js
const express = require('express');
const router = express.Router();
const caisseController = require('../controllers/caisse.controller');
const authMiddleware = require('../middlewares/auth');

// Middleware pour vérifier l'authentification
router.use(authMiddleware);

// Routes pour la gestion de caisse
router.get('/status', caisseController.getCaisseStatus);
router.post('/ouverture', caisseController.ouvrirCaisse);
router.post('/fermeture', caisseController.fermerCaisse);
router.post('/vente-especes', caisseController.enregistrerVenteEspeces);
router.get('/journal', caisseController.getJournalCaisse);
router.get('/historique', caisseController.getHistoriqueCaisses);
router.get('/transactions', caisseController.getTransactionsJournee);
router.get('/rapport-journalier', caisseController.genererRapportCaisse);
router.get('/rapport/:caisseId', caisseController.genererRapportCaisse);
router.get('/historique-ventes', caisseController.getHistoriqueVentes);
router.post('/mouvement', caisseController.ajouterMouvement);

module.exports = router;