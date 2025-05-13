const mongoose = require('mongoose');

const configNotificationSchema = new mongoose.Schema({
  utilisateur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type_notification: {
    type: String,
    enum: ['ECHEANCE', 'CAISSE', 'SYSTEME', 'DEPENSE'],
    required: true
  },
  actif: {
    type: Boolean,
    default: true
  },
  delai_avant: {
    type: Number,
    default: 0,
    comment: 'Jours avant l\'événement'
  },
  email_actif: {
    type: Boolean,
    default: true
  },
  sms_actif: {
    type: Boolean,
    default: false
  },
  push_actif: {
    type: Boolean,
    default: true
  },
  frequence: {
    type: String,
    enum: ['INSTANTANEE', 'JOURNALIERE', 'HEBDOMADAIRE'],
    default: 'INSTANTANEE'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour optimiser les recherches par utilisateur et type
configNotificationSchema.index({ utilisateur_id: 1, type_notification: 1 }, { unique: true });

// Méthode statique pour obtenir ou créer une configuration par défaut
configNotificationSchema.statics.getDefaultConfig = async function(utilisateurId, typeNotification) {
  let config = await this.findOne({ utilisateur_id: utilisateurId, type_notification: typeNotification });
  
  if (!config) {
    config = await this.create({
      utilisateur_id: utilisateurId,
      type_notification: typeNotification
    });
  }
  
  return config;
};

module.exports = mongoose.model('ConfigNotification', configNotificationSchema);