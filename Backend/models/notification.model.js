const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  titre: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['echeance', 'alerte', 'systeme', 'validation'], 
    required: true 
  },
  lien: String,
  lue: { type: Boolean, default: false },
  donnees: mongoose.Schema.Types.Mixed,
  expireAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 30*24*60*60*1000) // 30 jours
  }
}, { timestamps: true });

// Suppression automatique après expiration
notificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);