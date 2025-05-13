const express = require('express');
const router = express.Router();
const { validate } = require('../middlewares/validation');
const transactionController = require('../controllers/transaction.controller');
const Joi = require('joi');

// Schéma de validation aligné avec le modèle
const transactionSchema = Joi.object({
type: Joi.string().valid('VENTE', 'ACHAT', 'DEPENSE').required(),
tiersId: Joi.when('type', {
is: Joi.valid('VENTE', 'ACHAT'),
then: Joi.string().hex().length(24).required(),
otherwise: Joi.optional()
}),
numeroTransaction: Joi.string().required(),
dateTransaction: Joi.date().default(Date.now),
montantTotalHT: Joi.number().positive().required(),
montantTotalTTC: Joi.number().positive().required(),
montantTaxes: Joi.number().min(0).default(0),
statut: Joi.string().valid('BROUILLON', 'VALIDEE', 'ANNULEE').default('BROUILLON'),
reference: Joi.string().trim(),
notes: Joi.string(),
entrepriseId: Joi.string().hex().length(24).required(),
creePar: Joi.string().hex().length(24).required()
});

router.post(
'/',
validate({ body: transactionSchema }),
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
validate({ body: transactionSchema }),
transactionController.update
);

router.delete(
'/:id',
transactionController.delete
);

module.exports = router;