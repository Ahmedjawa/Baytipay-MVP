const mongoose = require('mongoose');

const dossierSchema = new mongoose.Schema({
  reference: { 
    type: String, 
    required: true,
    unique: true,
    uppercase: true
  },
  type: { 
    type: String, 
    enum: ['client', 'fournisseur'], 
    required: true 
  },
  intitule: { type: String, required: true },
  description: { type: String },
  responsable: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  soldeInitial: { type: Number, default: 0 },
  devise: { type: String, default: 'TND' },
  contacts: [{
    nom: String,
    poste: String,
    telephone: String,
    email: String,
    principal: { type: Boolean, default: false }
  }],
  adresse: {
    ligne1: String,
    ligne2: String,
    ville: String,
    codePostal: String,
    pays: { type: String, default: 'Tunisie' }
  },
  informationsBancaires: {
    banque: String,
    rib: String,
    iban: String,
    bic: String
  },
  documents: [{
    nom: String,
    url: String,
    type: { type: String, enum: ['contrat', 'facture', 'autre'] },
    dateUpload: { type: Date, default: Date.now }
  }],
  tags: [{ type: String }],
  customFields: mongoose.Schema.Types.Mixed
}, { 
  timestamps: true,
  toJSON: { virtuals: true } 
});

// Index pour recherche rapide
dossierSchema.index({ reference: 1, type: 1, intitule: 1 });

// Virtual pour les échéances liées
dossierSchema.virtual('echeances', {
  ref: 'Echeance',
  localField: '_id',
  foreignField: 'dossier'
});

module.exports = mongoose.model('Dossier', dossierSchema);