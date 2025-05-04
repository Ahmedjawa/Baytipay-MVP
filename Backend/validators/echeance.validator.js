const Joi = require('joi');

const createEcheanceSchema = Joi.object({
  dossier: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  type: Joi.string().valid('traite', 'cheque', 'virement', 'especes').required(),
  montant: Joi.number().positive().required(),
  dateEcheance: Joi.date().greater('now').required(),
  modePaiement: Joi.string().valid('bancaire', 'especes', 'mobile', 'autre').required(),
  detailsPaiement: Joi.object({
    banque: Joi.string(),
    numero: Joi.string(),
    dateEncaisse: Joi.date(),
    reference: Joi.string()
  }),
  notes: Joi.string()
});

const updateEcheanceSchema = createEcheanceSchema.keys({
  dossier: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  type: Joi.string().valid('traite', 'cheque', 'virement', 'especes'),
  montant: Joi.number().positive(),
  dateEcheance: Joi.date().greater('now')
}).min(1);

const updateStatutSchema = Joi.object({
  statut: Joi.string().valid('en_attente', 'paye', 'impaye', 'annule', 'retard').required(),
  commentaire: Joi.string()
});

module.exports = {
  createEcheanceSchema,
  updateEcheanceSchema,
  updateStatutSchema
};