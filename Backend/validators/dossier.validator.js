const Joi = require('joi');

const createDossierSchema = Joi.object({
  reference: Joi.string().required(),
  type: Joi.string().valid('client', 'fournisseur').required(),
  intitule: Joi.string().required(),
  description: Joi.string(),
  responsable: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  soldeInitial: Joi.number().min(0).default(0),
  contacts: Joi.array().items(
    Joi.object({
      nom: Joi.string().required(),
      poste: Joi.string(),
      telephone: Joi.string(),
      email: Joi.string().email(),
      principal: Joi.boolean()
    })
  ),
  adresse: Joi.object({
    ligne1: Joi.string(),
    ligne2: Joi.string(),
    ville: Joi.string(),
    codePostal: Joi.string(),
    pays: Joi.string()
  })
});

const updateDossierSchema = createDossierSchema.keys({
  reference: Joi.string(),
  type: Joi.string().valid('client', 'fournisseur')
}).min(1);

module.exports = {
  createDossierSchema,
  updateDossierSchema
};