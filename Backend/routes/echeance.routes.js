const express = require('express');
const echeanceRouter = express.Router();

const transactionController = require('../controllers/transaction.controller'); // Assurez-vous que ce chemin est correct

// Routes pour les échéances
echeanceRouter.get('/', transactionController.getAll);
echeanceRouter.get('/:id', transactionController.getById);
echeanceRouter.post('/', transactionController.create);
echeanceRouter.put('/:id', transactionController.update);
echeanceRouter.delete('/:id', transactionController.delete);
echeanceRouter.post('/echeancier', transactionController.generateEcheancier);

module.exports = echeanceRouter;