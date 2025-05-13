// models/facture.model.js
const mongoose = require('mongoose');

const factureSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'L\'ID de transaction est obligatoire']
  },
  venteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vente',
    required: [true, 'L\'ID de vente est obligatoire']
  },
  numeroFacture: {
    type: String,
    required: [true, 'Le numéro de facture est obligatoire']
  },
  dateFacture: {
    type: Date,
    default: Date.now,
    required: [true, 'La date de facturation est obligatoire']
  },
  dateEcheance: {
    type: Date
  },
  envoye: {
    type: Boolean,
    default: false
  },
  dateEnvoi: {
    type: Date
  },
  destinataireEmail: {
    type: String,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  urlFichier: {
    type: String
  },
  statut: {
    type: String,
    enum: ['BROUILLON', 'VALIDEE', 'PAYEE', 'PARTIELLEMENT_PAYEE', 'ANNULEE'],
    default: 'BROUILLON'
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Fonction statique pour générer un numéro de facture unique
factureSchema.statics.genererNumeroFacture = async function(entrepriseId) {
  const date = new Date();
  const annee = date.getFullYear().toString();
  const mois = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Récupérer la dernière facture
  const derniereFacture = await this.findOne(
    { entrepriseId },
    { numeroFacture: 1 },
    { sort: { 'numeroFacture': -1 } }
  );
  
  let sequence = 1;
  
  if (derniereFacture && derniereFacture.numeroFacture) {
    const match = derniereFacture.numeroFacture.match(/(\d+)$/);
    if (match) {
      sequence = parseInt(match[1], 10) + 1;
    }
  }
  
  // Format: FACT-YYYYMM-XXXX
  return `FACT-${annee}${mois}-${sequence.toString().padStart(4, '0')}`;
};

// Virtual pour accéder à la vente
factureSchema.virtual('vente', {
  ref: 'Vente',
  localField: 'venteId',
  foreignField: '_id',
  justOne: true
});

// Virtual pour accéder à la transaction
factureSchema.virtual('transaction', {
  ref: 'Transaction',
  localField: 'transactionId',
  foreignField: '_id',
  justOne: true
});

// Index pour améliorer les performances
factureSchema.index({ numeroFacture: 1 }, { unique: true });
factureSchema.index({ transactionId: 1 });
factureSchema.index({ venteId: 1 });
factureSchema.index({ dateFacture: -1 });
factureSchema.index({ statut: 1, entrepriseId: 1 });

module.exports = mongoose.model('Facture', factureSchema, 'factures');