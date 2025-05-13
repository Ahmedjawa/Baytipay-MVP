const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  utilisateur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['ECHEANCE', 'CAISSE', 'SYSTEME', 'DEPENSE'],
    required: true
  },
  reference_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reference_type: {
    type: String,
    required: true
  },
  titre: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  date_creation: {
    type: Date,
    default: Date.now,
    required: true
  },
  date_lecture: {
    type: Date
  },
  lue: {
    type: Boolean,
    default: false
  },
  priorite: {
    type: String,
    enum: ['NORMALE', 'URGENT', 'CRITIQUE'],
    default: 'NORMALE'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Marquer comme lue
notificationSchema.methods.marquerCommeLue = function() {
  this.lue = true;
  this.date_lecture = new Date();
  return this.save();
};

// Index pour optimiser les requêtes de notifications non lues par utilisateur
notificationSchema.index({ utilisateur_id: 1, lue: 1 });

// Index pour optimiser les recherches par référence
notificationSchema.index({ reference_id: 1, reference_type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);