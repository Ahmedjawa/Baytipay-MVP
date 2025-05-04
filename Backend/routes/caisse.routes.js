const express = require('express');
const router = express.Router();
const caisseController = require('../controllers/caisse.controller');

router.get('/', caisseController.getMouvements);
router.post('/', caisseController.addMouvement);

module.exports = router;
