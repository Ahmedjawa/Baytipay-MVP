const mongoose = require('mongoose');

const mouvementCaisseSchema = new mongoose.Schema({
  caisse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caisse',
    required: true
  },
  transaction_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  type: {
    type: String,
    enum: ['ENTREE', 'SORTIE'],
    required: true
  },
  montant: {
    type: Number,
    required: true
  },
  date_mouvement: {
    type: Date,
    default: Date.now,
    required: true
  },
  description: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Mettre à jour le solde théorique de la caisse après sauvegarde d'un mouvement
mouvementCaisseSchema.post('save', async function(doc) {
  const Caisse = mongoose.model('Caisse');
  const caisse = await Caisse.findById(doc.caisse_id);
  
  if (caisse && caisse.statut === 'OUVERTE') {
    // Ajuster le solde théorique selon le type de mouvement
    const montantAjuste = doc.type === 'ENTREE' ? doc.montant : -doc.montant;
    caisse.solde_theorique += montantAjuste;
    await caisse.save();
  }
});

module.exports = mongoose.model('MouvementCaisse', mouvementCaisseSchema);