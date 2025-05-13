// models/paiement.model.js
const mongoose = require('mongoose');

const PaiementSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'L\'ID de transaction est obligatoire']
  },
  type: {
    type: String,
    enum: ['ESPECES', 'CHEQUE', 'EFFET', 'CHEQUES_MULTIPLES', 'EFFETS_MULTIPLES','MIXTE'],
    required: [true, 'Le type de paiement est obligatoire']
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est obligatoire'],
    min: [0.01, 'Le montant doit être supérieur à 0']
  },
  datePaiement: {
    type: Date,
    default: Date.now,
    required: [true, 'La date de paiement est obligatoire']
  },
  reference: {
    type: String,
    required: function() {
      return [ 'CHEQUE', 'EFFET', 'CHEQUES_MULTIPLES', 'EFFETS_MULTIPLES','MIXTE'].includes(this.type); ;
    },
    trim: true
  },
 banque: {
  type: String,
  required: function() {
    return this.type !== 'ESPECES'; // ✅
  },
  default: '' // ✅ Valeur par défaut vide
},
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'ENCAISSE', 'DECAISSE', 'REJETE'],
    default: 'EN_ATTENTE'
  },
  dateStatut: {
    type: Date
  },
  notesPaiement: {
    type: String
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
}, {
  timestamps: true
});

// Index pour améliorer les performances
PaiementSchema.index({ transactionId: 1 });
PaiementSchema.index({ type: 1, datePaiement: -1 });
PaiementSchema.index({ statut: 1, entrepriseId: 1 });
PaiementSchema.index({ reference: 1 }, { sparse: true });

module.exports = mongoose.model('Paiement', PaiementSchema, 'paiements');