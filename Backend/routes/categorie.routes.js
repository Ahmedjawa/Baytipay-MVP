// routes/categorie.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/categorie.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

// Routes pour les catégories
router.post('/', 
  celebrate({
    body: Joi.object({
      nom: Joi.string().max(50).required(),
      type: Joi.string().valid('DEPENSE', 'REVENU').required(),
      description: Joi.string().max(200).allow('', null),
      couleur: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#3788d8'),
      icone: Joi.string().default('category'),
      parent: Joi.string().hex().length(24).allow(null),
      entrepriseId: Joi.string().hex().length(24).required(),
      estSysteme: Joi.boolean().default(false),
      actif: Joi.boolean().default(true)
    })
  }),
  authMiddleware, 
  controller.createCategorie
);

router.get('/', authMiddleware, controller.getAllCategories); 

router.get('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.getCategorieById
);

router.put('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    }),
    body: Joi.object({
      nom: Joi.string().max(50),
      type: Joi.string().valid('DEPENSE', 'REVENU'),
      description: Joi.string().max(200).allow('', null),
      couleur: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
      icone: Joi.string(),
      parent: Joi.string().hex().length(24).allow(null),
      actif: Joi.boolean()
    })
  }),
  authMiddleware,
  controller.updateCategorie
);

router.delete('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.deleteCategorie
);

// Routes spécifiques
router.get('/type/:type', 
  celebrate({
    params: Joi.object({
      type: Joi.string().valid('DEPENSE', 'REVENU').required()
    })
  }),
  authMiddleware,
  controller.getCategoriesByType
);

router.get('/search', 
  celebrate({
    query: Joi.object({
      q: Joi.string().required(),
      type: Joi.string().valid('DEPENSE', 'REVENU')
    })
  }),
  authMiddleware,
  controller.searchCategories
);

router.get('/entreprise/:entrepriseId', 
  celebrate({
    params: Joi.object({
      entrepriseId: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.getCategoriesByEntreprise
);

module.exports = router;