// models/echancier.model.js
const mongoose = require('mongoose');

const echeancierSchema = new mongoose.Schema({
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
  dateCreation: {
    type: Date,
    default: Date.now,
    required: [true, 'La date de création est obligatoire']
  },
  montantTotal: {
    type: Number,
    required: [true, 'Le montant total est obligatoire'],
    min: [0.01, 'Le montant doit être supérieur à 0']
  },
  nombreEcheances: {
    type: Number,
    required: [true, 'Le nombre d\'échéances est obligatoire'],
    min: [1, 'Le nombre d\'échéances doit être au moins 1']
  },
  statut: {
    type: String,
    enum: ['ACTIF', 'TERMINE', 'ANNULE'],
    default: 'ACTIF'
  },
  notesEcheancier: {
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual pour accéder aux échéances individuelles
echeancierSchema.virtual('echeances', {
  ref: 'Echeance',
  localField: 'transactionId',
  foreignField: 'transactionId'
});

// Méthode pour vérifier si l'échéancier est équilibré
echeancierSchema.methods.estEquilibre = async function() {
  const Echeance = mongoose.model('Echeance');
  
  const echeances = await Echeance.find({ transactionId: this.transactionId });
  const totalEcheances = echeances.reduce((sum, echeance) => sum + echeance.montant, 0);
  
  // Tolérance de 0.01 pour les erreurs d'arrondi
  return Math.abs(totalEcheances - this.montantTotal) < 0.01;
};

// Méthode pour générer des échéances réparties équitablement
echeancierSchema.methods.genererEcheancesEquitables = async function(dateDebut, intervalleJours = 30) {
  const Echeance = mongoose.model('Echeance');
  
  // Supprimer les échéances existantes
  await Echeance.deleteMany({ transactionId: this.transactionId });
  
  const montantParEcheance = parseFloat((this.montantTotal / this.nombreEcheances).toFixed(2));
  const reste = parseFloat((this.montantTotal - (montantParEcheance * this.nombreEcheances)).toFixed(2));
  
  const echeances = [];
  let dateEcheance = new Date(dateDebut);
  
  for (let i = 0; i < this.nombreEcheances; i++) {
    const montant = i === this.nombreEcheances - 1 ? 
      montantParEcheance + reste : montantParEcheance;
    
    const echeance = new Echeance({
      transactionId: this.transactionId,
      dateEcheance: new Date(dateEcheance),
      montant: montant,
      statut: 'A_RECEVOIR',
      entrepriseId: this.entrepriseId
    });
    
    await echeance.save();
    echeances.push(echeance);
    
    // Préparer la date pour la prochaine échéance
    dateEcheance.setDate(dateEcheance.getDate() + intervalleJours);
  }
  
  return echeances;
};

// Index pour améliorer les performances
echeancierSchema.index({ transactionId: 1 }, { unique: true });
echeancierSchema.index({ venteId: 1 }, { unique: true });
echeancierSchema.index({ statut: 1, entrepriseId: 1 });

module.exports = mongoose.model('Echeancier', echeancierSchema, 'echeanciers');