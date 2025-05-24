// routes/tiers.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/tiers.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

// Routes pour les tiers (générales)
router.post('/', controller.createTiers);        // POST /api/tiers
router.get('/', controller.getAllTiers);         // GET /api/tiers
router.get('/search', controller.searchTiers);   // GET /api/tiers/search?q=... - Must come before :id route
router.get('/:id', controller.getTiersById);     // GET /api/tiers/:id
router.put('/:id', controller.updateTiers);      // PUT /api/tiers/:id
router.delete('/:id', controller.deleteTiers);   // DELETE /api/tiers/:id

// Routes spécifiques pour les clients (utilisant les mêmes contrôleurs mais avec filtrage)
router.get('/clients/all', controller.getAllClients);           // GET /api/tiers/clients/all
router.post('/clients', controller.createClient);               // POST /api/tiers/clients
router.get('/clients/search', controller.searchClients);        // GET /api/tiers/clients/search?q=...
router.get('/clients/:id', controller.getClientById);           // GET /api/tiers/clients/:id
router.put('/clients/:id', controller.updateClient);            // PUT /api/tiers/clients/:id
router.delete('/clients/:id', controller.deleteClient);         // DELETE /api/tiers/clients/:id

// Routes existantes pour les tiers
router.get('/:id/paiements', authMiddleware, controller.getTiersPaiements);
router.get('/:id/transactions', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  controller.getTiersTransactions
);

// Routes spécifiques par type de tiers
router.get('/type/:type', controller.getTiersByType);   // GET /api/tiers/type/:type

module.exports = router;