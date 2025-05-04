const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  dossier: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Dossier',
    required: true 
  },
  type: { 
    type: String, 
    enum: ['debit', 'credit'], 
    required: true 
  },
  categorie: {
    type: String,
    enum: ['salaires', 'loyer', 'fournitures', 'service', 'autre'],
    required: true
  },
  montant: { type: Number, required: true, min: 0 },
  dateTransaction: { type: Date, default: Date.now },
  modePaiement: {
    type: String,
    enum: ['cheque', 'virement', 'especes', 'carte'],
    required: true
  },
  details: {
    numeroCheque: String,
    banque: String,
    reference: String
  },
  notes: String,
  piecesJointes: [{
    nom: String,
    url: String,
    type: String
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  recurrence: {
    active: { type: Boolean, default: false },
    frequence: { type: String, enum: ['mensuelle', 'trimestrielle', 'annuelle'] },
    dateFin: Date
  }
}, { timestamps: true });

// Index pour les rapports
transactionSchema.index({ dossier: 1, dateTransaction: 1 });
transactionSchema.index({ categorie: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);