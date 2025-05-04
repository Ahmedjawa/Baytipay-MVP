const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validation');
const transactionController = require('../controllers/transaction.controller');
const Joi = require('joi');

// Schéma de validation
const transactionSchema = Joi.object({
  dossier: Joi.string().hex().length(24).required(),
  type: Joi.string().valid('debit', 'credit').required(),
  categorie: Joi.string().valid('salaires', 'loyer', 'fournitures', 'service', 'autre').required(),
  montant: Joi.number().positive().required(),
  dateTransaction: Joi.date().default(Date.now),
  modePaiement: Joi.string().valid('cheque', 'virement', 'especes', 'carte').required(),
  details: Joi.object({
    numeroCheque: Joi.string(),
    banque: Joi.string(),
    reference: Joi.string()
  }).optional()
});

// Routes corrigées
router.post(
  '/',
  validate({ body: transactionSchema }), // Correction clé ici
  transactionController.create
);

router.get(
  '/',
  transactionController.getAll
);

router.get(
  '/:id',
  transactionController.getById
);

router.put(
  '/:id',
  validate({ body: transactionSchema }), // Correction clé ici
  transactionController.update
);

router.delete(
  '/:id',
  transactionController.delete
);

module.exports = router;