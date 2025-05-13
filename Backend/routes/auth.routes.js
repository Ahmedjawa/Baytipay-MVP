// server/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth');

// Routes publiques
router.post('/login', authController.login);
router.post('/register', authController.register);

// Routes protégées nécessitant authentification
router.get('/verify', authMiddleware, authController.verifyToken);
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;