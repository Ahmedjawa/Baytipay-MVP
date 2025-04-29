const mongoose = require('mongoose');

const partieSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['client', 'fournisseur'],
    required: true,
  },
  nom: {
    type: String,
    required: true,
  },
  adresse: String,
  telephone: String,
  email: String,
  matriculeFiscale: String,
  dateCreation: {
    type: Date,
    default: Date.now,
  },
  dossiers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dossier',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Partie', partieSchema);