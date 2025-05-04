const Joi = require('joi');
const { roles } = require('../config/roles');

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  nom: Joi.string().required(),
  prenom: Joi.string().required(),
  role: Joi.string().valid(...roles).default('gestionnaire'),
  isActive: Joi.boolean().default(true)
});

const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  nom: Joi.string(),
  prenom: Joi.string(),
  role: Joi.string().valid(...roles),
  isActive: Joi.boolean()
}).min(1);

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  loginSchema
};