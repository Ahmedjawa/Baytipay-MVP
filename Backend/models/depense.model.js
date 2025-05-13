// models/depense.model.js
const mongoose = require('mongoose');

// Schéma pour les notifications
const NotificationSchema = new mongoose.Schema({
  delaiPreAvis: {
    type: Number,
    default: 3,
    min: 0,
    max: 30
  },
  canaux: {
    type: [String],
    enum: ['APPLICATION', 'EMAIL', 'SMS'],
    default: ['APPLICATION']
  },
  rappels: {
    type: Boolean,
    default: false
  }
});

// Schéma pour la périodicité
const PeriodiciteSchema = new mongoose.Schema({
  frequence: {
    type: String,
    enum: ['QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE'],
    required: [true, 'La fréquence est obligatoire']
  },
  dateDebut: {
    type: Date,
    required: [true, 'La date de début est obligatoire']
  },
  dateFin: {
    type: Date
  },
  nombreOccurrences: {
    type: Number,
    min: 0,
    default: 0
  },
  notifications: {
    type: NotificationSchema,
    default: () => ({})
  }
});

// Schéma pour les justificatifs
const JustificatifSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true
  },
  chemin: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'image/jpeg'
  },
  taille: {
    type: Number
  },
  dateAjout: {
    type: Date,
    default: Date.now
  }
});

// Schéma principal de dépense
const DepenseSchema = new mongoose.Schema({
  categorie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categorie',
    required: [true, 'La catégorie est obligatoire']
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est obligatoire'],
    min: [0.01, 'Le montant doit être supérieur à 0']
  },
  dateDepense: {
    type: Date,
    required: [true, 'La date de dépense est obligatoire'],
    default: Date.now
  },
  beneficiaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'tiers'
  },
  description: {
    type: String,
    trim: true
  },
  estRecurrente: {
    type: Boolean,
    default: false
  },
  // Periodicité uniquement si estRecurrente === true
  periodicite: {
    type: PeriodiciteSchema
  },
  // Occurrence parent (si cette dépense est générée depuis une dépense récurrente)
  occurrenceParent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Depense'
  },
  paiement: {
    statut: {
      type: String,
      enum: ['A_PAYER', 'PAYEE', 'ANNULEE'],
      default: 'A_PAYER'
    },
    modePaiement: {
      type: String,
      enum: ['ESPECES', 'CHEQUE', 'EFFET', 'VIREMENT', 'CARTE_BANCAIRE', 'PRELEVEMENT'],
      default: 'ESPECES'
    },
    datePaiement: {
      type: Date
    },
    reference: {
      type: String,
      trim: true
    },
    banque: {
      type: String,
      trim: true
    }
  },
  justificatifs: [JustificatifSchema],
  notes: {
    type: String,
    trim: true
  },
  // Pour la gestion des récurrences générées
  occurrencesGenerees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Depense'
  }],
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  statut: {
    type: String,
    enum: ['ACTIVE', 'ANNULEE', 'ARCHIVEE'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// Indexation pour optimiser les performances
DepenseSchema.index({ entrepriseId: 1, dateDepense: -1 });
DepenseSchema.index({ beneficiaire: 1 });
DepenseSchema.index({ categorie: 1 });
DepenseSchema.index({ estRecurrente: 1 });
DepenseSchema.index({ 'paiement.statut': 1 });
DepenseSchema.index({ 'paiement.datePaiement': 1 });
DepenseSchema.index({ occurrenceParent: 1 });

module.exports = mongoose.model('Depense', DepenseSchema, 'depenses');