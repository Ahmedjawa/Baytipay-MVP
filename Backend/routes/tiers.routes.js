// routes/tiers.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/tiers.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

// Routes pour les tiers
router.post('/', controller.createTiers);        // POST /api/tiers
router.get('/', controller.getAllTiers);         // GET /api/tiers
router.get('/:id', controller.getTiersById);     // GET /api/tiers/:id
router.put('/:id', controller.updateTiers);      // PUT /api/tiers/:id
router.delete('/:id', controller.deleteTiers);   // DELETE /api/tiers/:id
router.get('/search', controller.searchTiers); // GET /api/tiers/search?q=...

//router.get('/:id/transactions', authMiddleware, controller.getTiersTransactions);
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