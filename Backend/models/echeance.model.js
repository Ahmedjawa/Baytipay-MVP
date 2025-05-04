const mongoose = require('mongoose');

const echeanceSchema = new mongoose.Schema({
  reference: { 
    type: String, 
    required: true,
    unique: true 
  },
  dossier: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Dossier',
    required: true 
  },
  type: { 
    type: String, 
    enum: ['traite', 'cheque', 'virement', 'especes'], 
    required: true 
  },
  montant: { 
    type: Number, 
    required: true,
    min: 0
  },
  dateEmission: { 
    type: Date, 
    default: Date.now 
  },
  dateEcheance: { 
    type: Date, 
    required: true 
  },
  statut: { 
    type: String, 
    enum: ['en_attente', 'paye', 'impaye', 'annule', 'retard'], 
    default: 'en_attente' 
  },
  modePaiement: {
    type: String,
    enum: ['bancaire', 'especes', 'mobile', 'autre'],
    required: true
  },
  detailsPaiement: {
    banque: String,
    numero: String,
    dateEncaisse: Date,
    reference: String
  },
  notes: String,
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  historique: [{
    date: { type: Date, default: Date.now },
    statut: String,
    modifiePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    commentaire: String
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true } 
});

// Index pour les requêtes fréquentes
echeanceSchema.index({ dossier: 1, dateEcheance: 1 });
echeanceSchema.index({ statut: 1, dateEcheance: 1 });

// Middleware pour l'historique
echeanceSchema.pre('save', function(next) {
  if (this.isModified('statut')) {
    this.historique.push({
      statut: this.statut,
      modifiePar: this._updatedBy || this.createdBy
    });
  }
  next();
});

module.exports = mongoose.model('Echeance', echeanceSchema);