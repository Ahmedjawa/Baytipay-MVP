// models/remise.model.js
const mongoose = require('mongoose');

const remiseSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'L\'ID de transaction est obligatoire']
  },
  ligneTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LigneTransaction'
  },
  type: {
    type: String,
    enum: ['POURCENTAGE', 'MONTANT_FIXE'],
    required: [true, 'Le type de remise est obligatoire']
  },
  valeur: {
    type: Number,
    required: [true, 'La valeur de la remise est obligatoire'],
    min: [0, 'La valeur doit être positive']
  },
  montant: {
    type: Number,
    required: [true, 'Le montant de la remise est obligatoire'],
    min: [0, 'Le montant doit être positif']
  },
  description: {
    type: String,
    trim: true
  },
  estGlobale: {
    type: Boolean,
    default: false
  },
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
remiseSchema.index({ transactionId: 1 });
remiseSchema.index({ ligneTransactionId: 1 });

module.exports = mongoose.model('Remise', remiseSchema, 'remises');