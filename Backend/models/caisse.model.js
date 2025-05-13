const mongoose = require('mongoose');

const caisseSchema = new mongoose.Schema({
  utilisateur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date_ouverture: {
    type: Date,
    required: true,
    default: Date.now
  },
  date_fermeture: {
    type: Date
  },
  solde_initial: {
    type: Number,
    required: true,
    default: 0
  },
  solde_theorique: {
    type: Number,
    required: true,
    default: 0
  },
  solde_reel: {
    type: Number
  },
  ecart: {
    type: Number,
    default: 0
  },
  statut: {
    type: String,
    enum: ['OUVERTE', 'FERMEE'],
    default: 'OUVERTE',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculer l'écart avant sauvegarde
caisseSchema.pre('save', function(next) {
  if (this.solde_reel !== undefined && this.solde_theorique !== undefined) {
    this.ecart = this.solde_reel - this.solde_theorique;
  }
  next();
});

// Relation avec les mouvements
caisseSchema.virtual('mouvements', {
  ref: 'MouvementCaisse',
  localField: '_id',
  foreignField: 'caisse_id'
});

module.exports = mongoose.model('Caisse', caisseSchema);