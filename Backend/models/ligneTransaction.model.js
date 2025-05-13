// models/ligneTransaction.model.js
const mongoose = require('mongoose');

const ligneTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'L\'ID de transaction est obligatoire']
  },
  produitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produit',
    required: function() { return this.type !== 'SERVICE'; }
  },
  designation: {
    type: String,
    required: [true, 'La désignation est obligatoire'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['PRODUIT', 'SERVICE'],
    default: 'PRODUIT'
  },
  quantite: {
    type: Number,
    required: [true, 'La quantité est obligatoire'],
    min: [0.01, 'La quantité doit être supérieure à 0']
  },
  unite: {
    type: String,
    default: 'unité',
    trim: true
  },
  prixUnitaireHT: {
    type: Number,
    required: [true, 'Le prix unitaire HT est obligatoire'],
    min: [0, 'Le prix unitaire doit être positif']
  },
  tauxTVA: {
    type: Number,
    default: 0,
    min: [0, 'Le taux de TVA doit être positif']
  },
  remise: {
    type: Number,
    default: 0,
    min: [0, 'La remise doit être positive'],
    max: [100, 'La remise ne peut dépasser 100%']
  },
  montantHT: {
    type: Number,
    required: [true, 'Le montant HT est obligatoire'],
    min: [0, 'Le montant HT doit être positif']
  },
  montantTVA: {
    type: Number,
    default: 0,
    min: [0, 'Le montant de TVA doit être positif']
  },
  montantTTC: {
    type: Number,
    required: [true, 'Le montant TTC est obligatoire'],
    min: [0, 'Le montant TTC doit être positif']
  },
  observations: {
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

// Pre-save hook to calculate montantTVA and montantTTC if not provided
ligneTransactionSchema.pre('save', function(next) {
  // Calculate montantHT if not provided
  if (!this.montantHT) {
    const prixApresRemise = this.prixUnitaireHT * (1 - (this.remise || 0) / 100);
    this.montantHT = prixApresRemise * this.quantite;
  }
  
  // Calculate montantTVA if not provided
  if (!this.montantTVA) {
    this.montantTVA = this.montantHT * (this.tauxTVA || 0) / 100;
  }
  
  // Calculate montantTTC if not provided
  if (!this.montantTTC) {
    this.montantTTC = this.montantHT + this.montantTVA;
  }
  
  next();
});

// Index for better performance
ligneTransactionSchema.index({ transactionId: 1 });
ligneTransactionSchema.index({ produitId: 1 });
ligneTransactionSchema.index({ entrepriseId: 1 });

const LigneTransaction = mongoose.model('LigneTransaction', ligneTransactionSchema, 'ligneTransactions');

module.exports = LigneTransaction;