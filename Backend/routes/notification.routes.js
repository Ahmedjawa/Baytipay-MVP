// routes/notification.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

// Routes pour les notifications
router.post('/', 
  celebrate({
    body: Joi.object({
      titre: Joi.string().max(100).required(),
      message: Joi.string().max(500).required(),
      type: Joi.string().valid('INFO', 'AVERTISSEMENT', 'ERREUR', 'SUCCES').default('INFO'),
      categorie: Joi.string().valid('DEPENSE', 'PAIEMENT', 'ECHEANCE', 'SYSTEME', 'AUTRE').default('AUTRE'),
      lien: Joi.string().allow('', null),
      canal: Joi.string().valid('APPLICATION', 'EMAIL', 'SMS').default('APPLICATION'),
      destinataireId: Joi.string().hex().length(24).required(),
      entiteId: Joi.string().hex().length(24),
      entiteType: Joi.string().valid('Depense', 'Paiement', 'CompteBancaire', null).default(null),
      entrepriseId: Joi.string().hex().length(24).required(),
      priorite: Joi.number().min(1).max(5).default(3),
      programmeePour: Joi.date()
    })
  }),
  authMiddleware,
  controller.createNotification
);

router.get('/', 
  authMiddleware, 
  controller.getAllNotifications
);

router.get('/mes-notifications', 
  authMiddleware,
  controller.getMesNotifications
);

router.get('/non-lues', 
  authMiddleware,
  controller.getNotificationsNonLues
);

router.get('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.getNotificationById
);

router.put('/:id/marquer-comme-lu', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.marquerCommeLu
);

router.put('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    }),
    body: Joi.object({
      titre: Joi.string().max(100),
      message: Joi.string().max(500),
      type: Joi.string().valid('INFO', 'AVERTISSEMENT', 'ERREUR', 'SUCCES'),
      categorie: Joi.string().valid('DEPENSE', 'PAIEMENT', 'ECHEANCE', 'SYSTEME', 'AUTRE'),
      lien: Joi.string().allow('', null),
      priorite: Joi.number().min(1).max(5),
      programmeePour: Joi.date(),
      statut: Joi.string().valid('EN_ATTENTE', 'ENVOYEE', 'ECHEC')
    })
  }),
  authMiddleware,
  controller.updateNotification
);

router.delete('/:id', 
  celebrate({
    params: Joi.object({
      id: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.deleteNotification
);

// Routes spécifiques pour les notifications
router.get('/categorie/:categorie', 
  celebrate({
    params: Joi.object({
      categorie: Joi.string().valid('DEPENSE', 'PAIEMENT', 'ECHEANCE', 'SYSTEME', 'AUTRE').required()
    })
  }),
  authMiddleware,
  controller.getNotificationsByCategorie
);

router.get('/canal/:canal', 
  celebrate({
    params: Joi.object({
      canal: Joi.string().valid('APPLICATION', 'EMAIL', 'SMS').required()
    })
  }),
  authMiddleware,
  controller.getNotificationsByCanal
);

router.get('/statut/:statut', 
  celebrate({
    params: Joi.object({
      statut: Joi.string().valid('EN_ATTENTE', 'ENVOYEE', 'ECHEC').required()
    })
  }),
  authMiddleware,
  controller.getNotificationsByStatut
);

router.get('/destinataire/:destinataireId', 
  celebrate({
    params: Joi.object({
      destinataireId: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.getNotificationsByDestinataire
);

router.get('/entite/:entiteType/:entiteId', 
  celebrate({
    params: Joi.object({
      entiteType: Joi.string().valid('Depense', 'Paiement', 'CompteBancaire').required(),
      entiteId: Joi.string().hex().length(24).required()
    })
  }),
  authMiddleware,
  controller.getNotificationsByEntite
);

router.put('/marquer-toutes-comme-lues', 
  authMiddleware,
  controller.marquerToutesCommeLues
);

module.exports = router;