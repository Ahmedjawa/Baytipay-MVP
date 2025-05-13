// models/transaction.model.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['VENTE', 'ACHAT', 'DEPENSE'],
    required: [true, 'Le type de transaction est obligatoire']
  },
  tiersId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tiers',
    required: function() { return this.type !== 'DEPENSE'; }
  },
  numeroTransaction: {
    type: String,
    unique: true,
    required: [true, 'Le numéro de transaction est obligatoire']
  },
  dateTransaction: {
    type: Date,
    default: Date.now,
    required: [true, 'La date de transaction est obligatoire']
  },
  montantTotalHT: {
    type: Number,
    required: [true, 'Le montant HT est obligatoire'],
    min: [0, 'Le montant doit être positif']
  },
  montantTotalTTC: {
    type: Number,
    required: [true, 'Le montant TTC est obligatoire'],
    min: [0, 'Le montant doit être positif']
  },
  montantTaxes: {
    type: Number,
    default: 0,
    min: [0, 'Le montant des taxes doit être positif']
  },
  statut: {
    type: String,
    enum: ['BROUILLON', 'VALIDEE', 'ANNULEE'],
    default: 'BROUILLON'
  },
  reference: {
    type: String,
    trim: true
  },
  piecesJointes: [{
  type: String // Stockage des URLs des scans
}],
typeDocument: {
  type: String,
  enum: ['FACTURE', 'BON_COMMANDE', 'AVOIR'],
  default: 'FACTURE'
},
  notes: {
    type: String
  },
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Fonction pour générer un numéro de transaction unique
TransactionSchema.statics.generateNumeroTransaction = async function(type, entrepriseId) {
  const date = new Date();
  const annee = date.getFullYear().toString().substr(-2);
  const mois = (date.getMonth() + 1).toString().padStart(2, '0');
  
  const prefix = type === 'VENTE' ? 'V' : type === 'ACHAT' ? 'A' : 'D';
  
  // Récupérer le dernier numéro de transaction pour ce type
  const dernierTransaction = await this.findOne(
    { type, entrepriseId },
    { numeroTransaction: 1 },
    { sort: { 'numeroTransaction': -1 } }
  );
  
  let sequence = 1;
  
  if (dernierTransaction && dernierTransaction.numeroTransaction) {
    // Extraire la séquence du dernier numéro
    const match = dernierTransaction.numeroTransaction.match(/(\d+)$/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }
  
  // Format: V/A/D-AAMM-XXXX (où XXXX est la séquence)
  return `${prefix}-${annee}${mois}-${sequence.toString().padStart(4, '0')}`;
};

// Index pour améliorer les performances
TransactionSchema.index({ type: 1, dateTransaction: -1 });
TransactionSchema.index({ tiersId: 1 });
TransactionSchema.index({ entrepriseId: 1, statut: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema, 'transactions');