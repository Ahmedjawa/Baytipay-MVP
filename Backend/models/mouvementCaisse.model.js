// models/mouvementCaisse.model.js
const mongoose = require('mongoose');

const mouvementCaisseSchema = new mongoose.Schema({
  caisse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caisse',
    required: true
  },
  type: {
    type: String,
    enum: ['ENCAISSEMENT', 'DECAISSEMENT', 'AJUSTEMENT'],
    required: true
  },
  montant: {
    type: Number,
    required: true
  },
  mode_paiement: {
    type: String,
    enum: ['ESPECES', 'CARTE', 'CHEQUE', 'VIREMENT'],
    required: true
  },
  reference_externe: {
    type: String,
    // Pour stocker la référence d'une vente, facture, etc.
  },
  description: {
    type: String,
    required: true
  },
  transaction_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
    // Lien optionnel vers la transaction correspondante
  },
  utilisateur_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date_mouvement: {
    type: Date,
    default: Date.now,
    required: true
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index pour faciliter les recherches
mouvementCaisseSchema.index({ caisse_id: 1, date_mouvement: -1 });
mouvementCaisseSchema.index({ type: 1 });
mouvementCaisseSchema.index({ reference_externe: 1 }, { sparse: true });

module.exports = mongoose.model('MouvementCaisse', mouvementCaisseSchema);