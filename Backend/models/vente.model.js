// models/vente.model.js
const mongoose = require('mongoose');

const venteSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'L\'ID de transaction est obligatoire']
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tiers',
    required: [true, 'Le client est obligatoire']
  },
  dateVente: {
    type: Date,
    default: Date.now,
    required: [true, 'La date de vente est obligatoire']
  },
  dateEcheance: {
    type: Date
  },
  modePaiement: {
    type: String,
    enum: ['ESPECES', 'CHEQUE_UNIQUE', 'EFFET_UNIQUE', 'CHEQUES_MULTIPLES', 'EFFETS_MULTIPLES', 'PAIEMENT_MIXTE'],
    required: [true, 'Le mode de paiement est obligatoire']
  },
  remiseGlobale: {
    type: Number,
    default: 0,
    min: [0, 'La remise doit être positive'],
    max: [100, 'La remise ne peut dépasser 100%']
  },
  statut: {
    type: String,
    enum: ['BROUILLON', 'VALIDEE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'ANNULEE'],
    default: 'BROUILLON'
  },
  montantPaye: {
    type: Number,
    default: 0,
    min: [0, 'Le montant payé doit être positif']
  },
  resteAPayer: {
    type: Number,
    default: 0,
    min: [0, 'Le reste à payer doit être positif']
  },
  notesInternes: {
    type: String
  },
  envoiFacture: {
    type: Boolean,
    default: false
  },
  dateEnvoiFacture: {
    type: Date
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
venteSchema.virtual('transaction', {
  ref: 'Transaction',
  localField: 'transactionId',
  foreignField: '_id',
  justOne: true
});

venteSchema.virtual('client', {
  ref: 'Tiers',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

venteSchema.virtual('paiements', {
  ref: 'Paiement',
  localField: 'transactionId',
  foreignField: 'transactionId'
});

venteSchema.virtual('echeances', {
  ref: 'Echeance',
  localField: 'transactionId',
  foreignField: 'transactionId'
});

venteSchema.virtual('lignes', {
  ref: 'LigneTransaction',
  localField: 'transactionId',
  foreignField: 'transactionId'
});

// Middleware pour mettre à jour le statut en fonction des paiements
venteSchema.pre('save', async function(next) {
  if (this.isModified('montantPaye') || this.isModified('resteAPayer')) {
    try {
      // Use mongoose.model to get the Transaction model at runtime
      const Transaction = mongoose.model('Transaction');
      const transaction = await Transaction.findById(this.transactionId);
      
      if (transaction) {
        if (this.montantPaye <= 0) {
          this.statut = 'VALIDEE';
        } else if (this.montantPaye >= transaction.montantTotalTTC) {
          this.statut = 'PAYEE';
          this.resteAPayer = 0;
        } else {
          this.statut = 'PARTIELLEMENT_PAYEE';
          this.resteAPayer = transaction.montantTotalTTC - this.montantPaye;
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Index pour améliorer les performances
venteSchema.index({ transactionId: 1 }, { unique: true });
venteSchema.index({ clientId: 1 });
venteSchema.index({ dateVente: -1 });
venteSchema.index({ statut: 1, entrepriseId: 1 });

module.exports = mongoose.model('Vente', venteSchema, 'ventes');