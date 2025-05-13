// controllers/paiement.controller.js
const Paiement = require('../models/paiement.model');
const Transaction = require('../models/transaction.model');

exports.getAllPaiements = async (req, res) => {
  try {
    const paiements = await Paiement.find({ entrepriseId: req.user.entrepriseId })
      .populate('transactionId');
    res.json(paiements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPaiementById = async (req, res) => {
  try {
    const paiement = await Paiement.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    }).populate('transactionId');
    
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });
    res.json(paiement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPaiement = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.body.transactionId);
    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });

    const newPaiement = new Paiement({
      ...req.body,
      entrepriseId: req.user.entrepriseId,
      creePar: req.user._id
    });

    const savedPaiement = await newPaiement.save();
    res.status(201).json(savedPaiement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updatePaiement = async (req, res) => {
  try {
    // Check if the paiement exists and belongs to the user's enterprise
    const paiement = await Paiement.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!paiement) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }
    
    // Fields that shouldn't be updated directly
    const restrictedFields = ['entrepriseId', 'creePar', 'transactionId'];
    
    // Remove restricted fields from update
    const updateData = Object.keys(req.body)
      .filter(key => !restrictedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
    
    // Update the paiement
    const updatedPaiement = await Paiement.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.json(updatedPaiement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePaiement = async (req, res) => {
  try {
    const paiement = await Paiement.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!paiement) {
      return res.status(404).json({ message: 'Paiement non trouvé' });
    }
    
    // Check if there are any dependencies before deletion
    // This could be expanded based on your application's needs
    
    await Paiement.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Paiement supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};