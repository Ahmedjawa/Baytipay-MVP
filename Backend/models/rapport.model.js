const mongoose = require('mongoose');

const rapportSchema = new mongoose.Schema({
  utilisateur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nom: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['VENTES', 'ACHATS', 'DEPENSES', 'TRESORERIE'],
    required: true
  },
  parametres: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  derniere_execution: {
    type: Date
  },
  frequence: {
    type: String,
    enum: ['QUOTIDIEN', 'HEBDOMADAIRE', 'MENSUEL', 'MANUEL'],
    default: 'MANUEL'
  },
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Méthode pour marquer l'exécution du rapport
rapportSchema.methods.marquerExecution = function() {
  this.derniere_execution = new Date();
  return this.save();
};

// Index pour optimiser les recherches des rapports actifs par fréquence
rapportSchema.index({ actif: 1, frequence: 1 });

// Index pour optimiser les recherches par utilisateur
rapportSchema.index({ utilisateur_id: 1 });

module.exports = mongoose.model('Rapport', rapportSchema);