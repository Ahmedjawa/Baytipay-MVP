// routes/article.routes.js
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

router.use(authMiddleware);

router.get('/', articleController.getAll);
router.post('/',
  celebrate({
    body: Joi.object({
      code: Joi.string().required(),
      designation: Joi.string().required(),
      type: Joi.string().valid('PRODUIT', 'SERVICE').required(),
      prixVenteHT: Joi.number().min(0).required(),
      prixAchatHT: Joi.number().min(0).default(0),
      tauxTaxe: Joi.number().min(0).max(100).default(19),
      actif: Joi.boolean().default(true),
	   stock: Joi.number().min(0).required(),
      description: Joi.string().allow('', null)
    })
  }),
  articleController.create
);
router.put('/:id', 
  celebrate({
    body: Joi.object({
      code: Joi.string().required(),
      designation: Joi.string().required(),
      type: Joi.string().valid('PRODUIT', 'SERVICE').required(),
      prixVenteHT: Joi.number().min(0).required(),
      prixAchatHT: Joi.number().min(0).default(0),
      tauxTaxe: Joi.number().min(0).max(100).default(19),
      actif: Joi.boolean().default(true),
	   stock: Joi.number().min(0).required(),
      description: Joi.string().allow('', null)
    })
  }),
  articleController.update
);
router.delete('/:id', articleController.delete);

module.exports = router;