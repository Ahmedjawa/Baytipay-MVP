const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entity_type: {
    type: String,
    enum: ['TRANSACTION', 'PAIEMENT', 'TIERS', 'DEPENSE'],
    required: true
  },
  type: {
    type: String,
    enum: ['FACTURE', 'RECU', 'BON_LIVRAISON', 'PIECE_JOINTE'],
    required: true
  },
  url_fichier: {
    type: String,
    required: true
  },
  date_creation: {
    type: Date,
    default: Date.now,
    required: true
  },
  nom_fichier: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index composite pour faciliter la recherche par entité
documentSchema.index({ entity_id: 1, entity_type: 1 });

// Méthode statique pour trouver tous les documents associés à une entité
documentSchema.statics.findByEntity = function(entityId, entityType) {
  return this.find({
    entity_id: entityId,
    entity_type: entityType
  });
};

module.exports = mongoose.model('Document', documentSchema);