const express = require('express');
const router = express.Router();

const dataController = require('../controllers/data.controller');

// Middleware d'authentification
router.use(require('../middlewares/auth'));

// Route pour récupérer les données de base
router.get('/api/data', dataController.getData);

module.exports = router;