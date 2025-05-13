// routes/vente.routes.js
const express = require('express');
const router = express.Router();
const venteController = require('../controllers/vente.controller');
const authMiddleware = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET all sales
router.get('/', venteController.getAllVentes);

// GET sale by ID
router.get('/:id', venteController.getVenteById);

// CREATE new sale
router.post('/', venteController.createVente);

// UPDATE sale
router.put('/:id', venteController.updateVente);

// DELETE sale
router.delete('/:id', venteController.deleteVente);

module.exports = router;