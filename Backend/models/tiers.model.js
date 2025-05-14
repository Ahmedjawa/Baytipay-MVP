// models/tiers.model.js
const mongoose = require('mongoose');

const TiersSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['CLIENT', 'FOURNISSEUR', 'AUTRE'],
    required: [true, 'Le type de tiers est obligatoire'],
    default: 'CLIENT'
  },
nom: {
  type: String,
  required: [true, 'Le nom est obligatoire'],
  trim: true,
  minlength: [3, 'Le nom doit contenir au moins 3 caractères'],
  maxlength: [100, 'Le nom ne peut excéder 100 caractères']
},
  adresse: {
    type: String,
    required: [true, 'L\'adresse est obligatoire']
  },
  telephone: {
    type: String,
    match: [/^[0-9]{8}$/, 'Numéro de téléphone invalide']
  },
  email: {
    type: String,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  siteWeb: {
    type: String
  },
 matriculeFiscal: {
  type: String,
  required: function() { 
    return this.type === 'CLIENT' && this.nom !== 'Client comptoir'; 
  },
  match: [/^[0-9]{7}[A-Za-z]{3}$/, 'Format matricule fiscale invalide']
},
  actif: {
    type: Boolean,
    default: true
  },
  soldeCourant: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances de recherche
TiersSchema.index({ matriculeFiscal: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Tiers', TiersSchema, 'tiers');