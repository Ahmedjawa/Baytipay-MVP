// routes/compteBancaire.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/compteBancaire.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

// Routes pour les comptes bancaires
router.post('/', 
  celebrate({
    body: Joi.object({
      nom: Joi.string().max(100).required(),
      type: Joi.string().valid('COURANT', 'EPARGNE', 'CARTE_CREDIT', 'CAISSE').required(),
      banque: Joi.string().when('type', {
        is: Joi.valid('COURANT', 'EPARGNE', 'CARTE_CREDIT'),
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      numero: Joi.string().when('type', {
        is: Joi.valid('COURANT', 'EPARGNE', 'CARTE_CREDIT'),
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      iban: Joi.string().allow('', null),
      swift: Joi.string().allow('', null),
      soldeInitial: Joi.number().default(0),
      dateOuverture: Joi.date().default(Date.now),
      description: Joi.string().max(200).allow('', null),
      actif: Joi.boolean().default(true),
      estPrincipal: Joi.boolean().default(false),
      deviseId: Joi.string().default('EUR'),
      entrepriseId: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.createCompteBancaire
);

router.get('/', 
  authMiddleware, 
  controller.getAllComptesBancaires
);

router.get('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.getCompteBancaireById
);

router.put('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    }),
    body: Joi.object({
      nom: Joi.string().max(100),
      type: Joi.string().valid('COURANT', 'EPARGNE', 'CARTE_CREDIT', 'CAISSE'),
      banque: Joi.string(),
      numero: Joi.string(),
      iban: Joi.string().allow('', null),
      swift: Joi.string().allow('', null),
      description: Joi.string().max(200).allow('', null),
      actif: Joi.boolean(),
      estPrincipal: Joi.boolean(),
      deviseId: Joi.string()
    })
  }),
  authMiddleware,
  controller.updateCompteBancaire
);

router.delete('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.deleteCompteBancaire
);

// Routes spécifiques pour les comptes bancaires
router.get('/type/:type', 
  celebrate({
    params: Joi.object({
      type: Joi.string().valid('COURANT', 'EPARGNE', 'CARTE_CREDIT', 'CAISSE').required()
    })
  }),
  authMiddleware,
  controller.getComptesBancairesByType
);

router.get('/entreprise/:entrepriseId', 
  celebrate({
    params: Joi.object({
      entrepriseId: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.getComptesBancairesByEntreprise
);

router.put('/:id/solde', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    }),
    body: Joi.object({
      montant: Joi.number().required(),
      type: Joi.string().valid('CREDIT', 'DEBIT').required()
    })
  }),
  authMiddleware,
  controller.updateSoldeCompteBancaire
);

router.get('/:id/transactions', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    }),
    query: Joi.object({
      dateDebut: Joi.date(),
      dateFin: Joi.date(),
      type: Joi.string().valid('CREDIT', 'DEBIT')
    })
  }),
  authMiddleware,
  controller.getCompteBancaireTransactions
);

module.exports = router;