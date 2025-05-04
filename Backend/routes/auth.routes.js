const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Middleware de validation
const { check } = require('express-validator');

// Route d'inscription
router.post('/register', 
  [
    check('email').isEmail().normalizeEmail(),
    check('password').isLength({ min: 8 }),
    check('nom').not().isEmpty(),
    check('prenom').not().isEmpty()
  ],
  authController.register
);

// Route de connexion
router.post('/login',
  [
    check('email').isEmail().normalizeEmail(),
    check('password').exists()
  ],
  authController.login
);

module.exports = router;
