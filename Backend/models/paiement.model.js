// models/paiement.model.js
const mongoose = require('mongoose');

const paiementSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  venteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vente',
    required: true
  },
  type: {
    type: String,
    enum: ['ESPECES', 'CHEQUE', 'EFFET', 'VIREMENT', 'CARTE'],
    required: true
  },
  montant: {
    type: Number,
    required: true,
    min: 0
  },
  datePaiement: {
    type: Date,
    default: Date.now
  },
  dateEcheance: {
    type: Date
  },
  reference: {
    type: String
  },
  banque: {
    type: String
  },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'ENCAISSE', 'DECAISSE', 'REJETE', 'ANNULE'],
    default: 'EN_ATTENTE'
  },
  notesPaiement: {
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

// Middleware pour mettre à jour le statut de la vente après un paiement
paiementSchema.post('save', async function() {
  try {
    const Vente = mongoose.model('Vente');
    const vente = await Vente.findById(this.venteId);
    if (vente) {
      await vente.mettreAJourStatut();
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de la vente:', error);
  }
});

// Méthode pour vérifier si le paiement est en retard
paiementSchema.methods.estEnRetard = function() {
  if (!this.dateEcheance) return false;
  return this.dateEcheance < new Date() && this.statut === 'EN_ATTENTE';
};

// Méthode pour calculer les jours de retard
paiementSchema.methods.calculerJoursRetard = function() {
  if (!this.estEnRetard()) return 0;
  const aujourdhui = new Date();
  const diffTime = Math.abs(aujourdhui - this.dateEcheance);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Méthode pour valider un paiement
paiementSchema.methods.valider = async function() {
  if (this.statut !== 'EN_ATTENTE') {
    throw new Error('Seuls les paiements en attente peuvent être validés');
  }
  
  this.statut = 'ENCAISSE';
  await this.save();
  
  // Mettre à jour le statut de la vente
  const Vente = mongoose.model('Vente');
  const vente = await Vente.findById(this.venteId);
  if (vente) {
    await vente.mettreAJourStatut();
  }
};

// Méthode pour rejeter un paiement
paiementSchema.methods.rejeter = async function(raison) {
  if (this.statut !== 'EN_ATTENTE') {
    throw new Error('Seuls les paiements en attente peuvent être rejetés');
  }
  
  this.statut = 'REJETE';
  this.notesPaiement = raison;
  await this.save();
  
  // Mettre à jour le statut de la vente
  const Vente = mongoose.model('Vente');
  const vente = await Vente.findById(this.venteId);
  if (vente) {
    await vente.mettreAJourStatut();
  }
};

const Paiement = mongoose.model('Paiement', paiementSchema);

module.exports = Paiement;