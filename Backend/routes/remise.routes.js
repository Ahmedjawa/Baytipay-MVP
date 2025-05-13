// routes/remise.routes.js
const express = require('express');
const router = express.Router();
const remiseController = require('../controllers/remise.controller');
const authMiddleware = require('../middlewares/auth');
const { celebrate, Joi } = require('celebrate');

router.use(authMiddleware);

router.get('/transaction/:transactionId', remiseController.getByTransaction);
router.post('/', 
  celebrate({
    body: Joi.object({
      transactionId: Joi.string().required(),
      type: Joi.string().valid('POURCENTAGE', 'MONTANT_FIXE').required(),
      valeur: Joi.number().min(0).required(),
      description: Joi.string().max(255),
      ligneTransactionId: Joi.string().allow(null)
    })
  }),
  remiseController.create
);
router.delete('/:id', remiseController.delete);

module.exports = router;