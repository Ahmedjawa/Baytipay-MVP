// routes/echeancier.routes.js
const express = require('express');
const router = express.Router();
const { celebrate } = require('celebrate'); // Import celebrate
const Joi = require('joi'); // Import Joi
const echeancierController = require('../controllers/echeancier.controller');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/transaction/:transactionId', echeancierController.getByTransaction);
router.post('/generer-auto', 
  celebrate({
    body: Joi.object({
      transactionId: Joi.string().required(),
      nombreEcheances: Joi.number().min(1).required(),
      dateDebut: Joi.date().required(),
      intervalleJours: Joi.number().min(1)
    })
  }),
  echeancierController.genererAuto
);
router.delete('/:id', echeancierController.delete);

module.exports = router;