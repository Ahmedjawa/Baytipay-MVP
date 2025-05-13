// routes/paiement.routes.js
const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiement.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

router.use(authMiddleware);

router.get('/', paiementController.getAllPaiements);
router.get('/:id', paiementController.getPaiementById);
router.post('/', 
  celebrate({
    body: Joi.object({
      transactionId: Joi.string().required(),
      type: Joi.string().valid('ESPECES', 'CHEQUE', 'EFFET', 'VIREMENT', 'CARTE').required(),
      montant: Joi.number().min(0.01).required(),
      reference: Joi.string().when('type', {
        is: Joi.valid('CHEQUE', 'EFFET', 'VIREMENT'),
        then: Joi.required()
      }),
      banque: Joi.string().when('type', {
        is: Joi.valid('CHEQUE', 'EFFET', 'VIREMENT'),
        then: Joi.required()
      })
    })
  }),
  paiementController.createPaiement
);
router.put('/:id', paiementController.updatePaiement);
router.delete('/:id', paiementController.deletePaiement);

module.exports = router;