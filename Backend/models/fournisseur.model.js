const mongoose = require('mongoose');

const FournisseurSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true
  },
  adresse: {
    type: String,
    required: [true, 'L\'adresse est obligatoire']
  },
  telephone: {
    type: String,
    required: [true, 'Le téléphone est obligatoire'],
    match: [/^[0-9]{8}$/, 'Numéro de téléphone invalide']
  },
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  matriculeFiscale: {
    type: String,
    required: [true, 'La matricule fiscale est obligatoire'],
    unique: true,
    match: [/^[0-9]{7}[A-Z]{3}$/, 'Format matricule invalide']
  },
  type: {
    type: String,
    default: 'fournisseur',
    immutable: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Fournisseur', FournisseurSchema);