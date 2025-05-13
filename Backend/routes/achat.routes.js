const express = require('express');
const router = express.Router();
const achatController = require('../controllers/achat.controller');
const authMiddleware = require('../middlewares/auth');

router.post('/', authMiddleware, achatController.createAchat);
router.get('/', authMiddleware, achatController.getAllAchats);
router.get('/:id', authMiddleware, achatController.getAchatById);
router.put('/:id', authMiddleware, achatController.updateAchat);
router.delete('/:id', authMiddleware, achatController.deleteAchat);

module.exports = router;