// controllers/echeancier.controller.js
const Echeancier = require('../models/echeancier.model');
const Echeance = require('../models/echeance.model');

exports.getByTransaction = async (req, res, next) => {
  try {
    const echeancier = await Echeancier.findOne({
      transactionId: req.params.transactionId,
      entrepriseId: req.user.entrepriseId
    }).populate('echeances');
    
    res.json(echeancier);
  } catch (error) {
    next(error);
  }
};

exports.genererAuto = async (req, res, next) => {
  try {
    const echeancier = await Echeancier.findOne({
      transactionId: req.body.transactionId,
      entrepriseId: req.user.entrepriseId
    });

    if (!echeancier) {
      return res.status(404).json({ message: 'Échéancier non trouvé' });
    }

    const echeances = await echeancier.genererEcheancesEquitables(
      req.body.dateDebut,
      req.body.intervalleJours
    );
    
    res.json({ echeancier, echeances });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await Echeance.deleteMany({ echeancier: req.params.id });
    const echeancier = await Echeancier.findOneAndDelete({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!echeancier) return res.status(404).json({ message: 'Échéancier non trouvé' });
    res.json({ message: 'Échéancier supprimé' });
  } catch (error) {
    next(error);
  }
};