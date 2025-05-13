// routes/recurrence.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/recurrence.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

// Routes pour les récurrences
router.post('/', 
  celebrate({
    body: Joi.object({
      nom: Joi.string().max(100).required(),
      description: Joi.string().max(200).allow('', null),
      frequence: Joi.string().valid('QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE').required(),
      joursHebdo: Joi.array().items(Joi.number().min(1).max(7)).when('frequence', {
        is: 'HEBDOMADAIRE',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      jourMois: Joi.number().min(1).max(31).when('frequence', {
        is: 'MENSUELLE',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      notifications: Joi.object({
        delaiPreAvis: Joi.number().min(0).max(30).default(3),
        canaux: Joi.array().items(Joi.string().valid('APPLICATION', 'EMAIL', 'SMS')).default(['APPLICATION']),
        rappels: Joi.boolean().default(false)
      }),
      estModeleParDefaut: Joi.boolean().default(false),
      entrepriseId: Joi.string().hex().length(24).required(),
      actif: Joi.boolean().default(true)
    })
  }),
  authMiddleware,
  controller.createRecurrence
);

router.get('/', 
  authMiddleware, 
  controller.getAllRecurrences
);

router.get('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.getRecurrenceById
);

router.put('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    }),
    body: Joi.object({
      nom: Joi.string().max(100),
      description: Joi.string().max(200).allow('', null),
      frequence: Joi.string().valid('QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE'),
      joursHebdo: Joi.array().items(Joi.number().min(1).max(7)),
      jourMois: Joi.number().min(1).max(31),
      notifications: Joi.object({
        delaiPreAvis: Joi.number().min(0).max(30),
        canaux: Joi.array().items(Joi.string().valid('APPLICATION', 'EMAIL', 'SMS')),
        rappels: Joi.boolean()
      }),
      estModeleParDefaut: Joi.boolean(),
      actif: Joi.boolean()
    })
  }),
  authMiddleware,
  controller.updateRecurrence
);

router.delete('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.deleteRecurrence
);

// Routes spécifiques pour les récurrences
router.get('/frequence/:frequence', 
  celebrate({
    params: Joi.object({
      frequence: Joi.string().valid('QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE').required()
    })
  }),
  authMiddleware,
  controller.getRecurrencesByFrequence
);

router.get('/entreprise/:entrepriseId', 
  celebrate({
    params: Joi.object({
      entrepriseId: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.getRecurrencesByEntreprise
);

router.get('/modeles-par-defaut', 
  authMiddleware,
  controller.getRecurrencesParDefaut
);

router.post('/:id/appliquer-a-depense/:depenseId', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required(),
      depenseId: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.appliquerRecurrenceADepense
);

module.exports = router;