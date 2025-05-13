// models/entreprise.model.js
const mongoose = require('mongoose');

const EntrepriseSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de l\'entreprise est obligatoire'],
    trim: true
  },
  formeJuridique: {
    type: String,
    enum: ['SARL', 'SA', 'SAS', 'EI', 'EURL', 'Autre'],
    required: [true, 'La forme juridique est obligatoire']
  },
  numeroFiscal: {
    type: String,
    required: [true, 'Le numéro fiscal est obligatoire'],
    unique: true,
    match: [/^[0-9A-Z]{8,15}$/, 'Format du numéro fiscal invalide']
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
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  logoUrl: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Entreprise', EntrepriseSchema, 'entreprises');