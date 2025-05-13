const mongoose = require('mongoose');

const achatSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  fournisseurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tiers',
    required: true
  },
  dateAchat: {
    type: Date,
    default: Date.now
  },
  documents: [{
    type: String // URLs des documents scannés
  }],
  statut: {
    type: String,
    enum: ['BROUILLON', 'VALIDEE', 'ANNULEE'],
    default: 'BROUILLON'
  },
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Achat', achatSchema);