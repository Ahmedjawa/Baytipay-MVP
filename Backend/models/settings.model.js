const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  },
  nom: {
    type: String,
    required: true
  },
  formeJuridique: {
    type: String,
    enum: ['SARL', 'SA', 'SAS', 'EURL', 'SNC', 'SCI', 'Auto-entrepreneur'],
    default: 'SARL'
  },
  numeroFiscal: {
    type: String,
    required: true
  },
  adresse: {
    type: String,
    required: true
  },
  telephone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  logoUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
