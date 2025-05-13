// models/echeance.model.js
const mongoose = require('mongoose');

const echeanceSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'L\'ID de transaction est obligatoire']
  },
  echeancierID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Echeancier',
    required: false
  },
  dateEcheance: {
    type: Date,
    required: [true, 'La date d\'échéance est obligatoire']
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est obligatoire'],
    min: [0.01, 'Le montant doit être supérieur à 0']
  },
  statut: {
    type: String,
    enum: ['A_RECEVOIR', 'RECU', 'IMPAYE', 'ANNULE','A_PAYER'],
    default: 'A_RECEVOIR'
  },
  reference: {
    type: String,
    trim: true
  },
  banque: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['CHEQUE', 'EFFET', 'VIREMENT', 'ESPECES', 'AUTRE'],
    default: 'CHEQUE'
  },
  dateEncaissement: {
    type: Date
  },
  notes: {
    type: String
  },
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  },
  tiersId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tiers',
    required: false
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
echeanceSchema.index({ transactionId: 1 });
echeanceSchema.index({ dateEcheance: 1 });
echeanceSchema.index({ statut: 1 });
echeanceSchema.index({ entrepriseId: 1 });

// Middleware pre-save pour générer automatiquement une référence si non spécifiée
echeanceSchema.pre('save', function(next) {
  if (!this.reference) {
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
    this.reference = `ECH-${dateStr}-${randomStr}`;
  }
  next();
});

module.exports = mongoose.model('Echeance', echeanceSchema, 'echeances');