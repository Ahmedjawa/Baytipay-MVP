// controllers/remise.controller.js
const Remise = require('../models/remise.model');
const Transaction = require('../models/transaction.model');

exports.getByTransaction = async (req, res, next) => {
  try {
    const remises = await Remise.find({
      transactionId: req.params.transactionId,
      entrepriseId: req.user.entrepriseId
    }).populate('ligneTransactionId');
    
    res.json(remises);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.body.transactionId);
    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });

    const remise = new Remise({
      ...req.body,
      entrepriseId: req.user.entrepriseId
    });

    await remise.save();
    res.status(201).json(remise);
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const remise = await Remise.findOneAndDelete({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!remise) return res.status(404).json({ message: 'Remise non trouvée' });
    res.json({ message: 'Remise supprimée' });
  } catch (error) {
    next(error);
  }
};