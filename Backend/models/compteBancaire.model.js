// models/compteBancaire.model.js
const mongoose = require('mongoose');

const CompteBancaireSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom du compte est obligatoire'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  type: {
    type: String,
    enum: ['COURANT', 'EPARGNE', 'CARTE_CREDIT', 'CAISSE'],
    default: 'COURANT',
    required: [true, 'Le type de compte est obligatoire']
  },
  banque: {
    type: String,
    required: function() {
      return this.type !== 'CAISSE';
    },
    trim: true
  },
  numero: {
    type: String,
    required: function() {
      return this.type !== 'CAISSE';
    },
    trim: true,
    validate: {
      validator: function(v) {
        return this.type === 'CAISSE' || v.length > 0;
      },
      message: 'Le numéro de compte est obligatoire pour les comptes bancaires'
    }
  },
  iban: {
    type: String,
    trim: true
  },
  swift: {
    type: String,
    trim: true
  },
  soldeInitial: {
    type: Number,
    required: [true, 'Le solde initial est obligatoire'],
    default: 0
  },
  soldeCourant: {
    type: Number,
    default: function() {
      return this.soldeInitial;
    }
  },
  dateOuverture: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'La description ne peut pas dépasser 200 caractères']
  },
  actif: {
    type: Boolean,
    default: true
  },
  estPrincipal: {
    type: Boolean,
    default: false
  },
  deviseId: {
    type: String,
    default: 'EUR',
    required: [true, 'La devise est obligatoire']
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

// Méthode pour mettre à jour le solde courant
CompteBancaireSchema.methods.updateSolde = function(montant, type) {
  if (type === 'CREDIT') {
    this.soldeCourant += montant;
  } else if (type === 'DEBIT') {
    this.soldeCourant -= montant;
  }
  return this.save();
};

// Index pour améliorer les performances
CompteBancaireSchema.index({ entrepriseId: 1 });
CompteBancaireSchema.index({ actif: 1 });
CompteBancaireSchema.index({ type: 1 });
CompteBancaireSchema.index({ estPrincipal: 1 });

module.exports = mongoose.model('CompteBancaire', CompteBancaireSchema, 'comptesBancaires');