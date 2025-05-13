// models/contact.model.js
const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  tiersId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tiers',
    required: [true, 'L\'ID du tiers est obligatoire']
  },
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true
  },
  fonction: {
    type: String,
    trim: true
  },
  telephone: {
    type: String,
    required: [true, 'Le téléphone est obligatoire'],
    match: [/^[0-9]{8}$/, 'Numéro de téléphone invalide']
  },
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  contactPrincipal: {
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
ContactSchema.index({ tiersId: 1, contactPrincipal: 1 });
ContactSchema.index({ email: 1, entrepriseId: 1 });

module.exports = mongoose.model('Contact', ContactSchema, 'contacts');