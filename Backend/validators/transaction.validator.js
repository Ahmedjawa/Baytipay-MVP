const Joi = require('joi');

const createTransactionSchema = Joi.object({
  dossier: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  type: Joi.string().valid('debit', 'credit').required(),
  categorie: Joi.string().valid(
    'salaires', 'loyer', 'fournitures', 'service', 'autre'
  ).required(),
  montant: Joi.number().positive().required(),
  dateTransaction: Joi.date().default(Date.now),
  modePaiement: Joi.string().valid(
    'cheque', 'virement', 'especes', 'carte'
  ).required(),
  details: Joi.object({
    numeroCheque: Joi.string(),
    banque: Joi.string(),
    reference: Joi.string()
  }),
  notes: Joi.string(),
  recurrence: Joi.object({
    active: Joi.boolean().default(false),
    frequence: Joi.string().valid('mensuelle', 'trimestrielle', 'annuelle'),
    dateFin: Joi.date()
  })
});

module.exports = {
  createTransactionSchema
};