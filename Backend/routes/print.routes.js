const express = require('express');
const router = express.Router();
const printController = require('../controllers/print.controller');

router.post('/traite', printController.printTraite);
router.post('/cheque', printController.printCheque);

module.exports = router;
