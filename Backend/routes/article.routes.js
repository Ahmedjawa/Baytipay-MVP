// routes/article.routes.js
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

router.use(authMiddleware);

// Récupérer tous les articles
router.get('/', articleController.getAll);

// Récupérer un article par ID
router.get('/:id', articleController.getById);

// Rechercher des articles
router.get('/search', articleController.search);

// Créer un nouvel article
router.post('/',
  celebrate({
    body: Joi.object({
      code: Joi.string().required(),
      designation: Joi.string().required(),
      type: Joi.string().valid('PRODUIT', 'SERVICE').required(),
      prixVenteHT: Joi.number().min(0).required(),
      prixAchatHT: Joi.number().min(0).default(0),
      prixAchatMoyen: Joi.number().min(0).default(0),
      dernierPrixAchat: Joi.number().min(0).default(0),
      codeBarre: Joi.string().allow('', null),
      categorie: Joi.string().required(),
      tauxTaxe: Joi.number().min(0).max(100).default(19),
      actif: Joi.boolean().default(true),
      stock: Joi.number().min(0).required(),
      description: Joi.string().allow('', null)
    })
  }),
  articleController.create
);

// Mettre à jour un article
router.put('/:id', 
  celebrate({
    body: Joi.object({
      code: Joi.string().required(),
      designation: Joi.string().required(),
      type: Joi.string().valid('PRODUIT', 'SERVICE').required(),
      prixVenteHT: Joi.number().min(0).required(),
      prixAchatHT: Joi.number().min(0).default(0),
      prixAchatMoyen: Joi.number().min(0).default(0),
      dernierPrixAchat: Joi.number().min(0).default(0),
      codeBarre: Joi.string().allow('', null),
      categorie: Joi.string().required(),
      tauxTaxe: Joi.number().min(0).max(100).default(19),
      actif: Joi.boolean().default(true),
      stock: Joi.number().min(0).required(),
      description: Joi.string().allow('', null)
    })
  }),
  articleController.update
);

// Supprimer un article (désactiver)
router.delete('/:id', articleController.delete);

module.exports = router;