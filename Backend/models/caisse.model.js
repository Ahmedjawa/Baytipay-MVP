const mongoose = require('mongoose');

const mouvementSchema = new mongoose.Schema({
  type: { type: String, enum: ['entree', 'sortie'], required: true },
  date: { type: Date, default: Date.now },
  montant: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  reference: String,
  categorie: {
    type: String,
    enum: ['vente', 'remboursement', 'depense', 'salaire', 'autre'],
    required: true
  },
  validePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const caisseSchema = new mongoose.Schema({
  intitule: { type: String, required: true },
  dateOuverture: { type: Date, default: Date.now },
  dateFermeture: Date,
  soldeInitial: { type: Number, default: 0 },
  soldeFinal: Number,
  mouvements: [mouvementSchema],
  statut: { type: String, enum: ['ouverte', 'fermee'], default: 'ouverte' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { timestamps: true });

// Calcul automatique du solde final
caisseSchema.pre('save', function(next) {
  if (this.isModified('mouvements')) {
    const totalEntrees = this.mouvements
      .filter(m => m.type === 'entree')
      .reduce((sum, m) => sum + m.montant, 0);
    
    const totalSorties = this.mouvements
      .filter(m => m.type === 'sortie')
      .reduce((sum, m) => sum + m.montant, 0);
    
    this.soldeFinal = this.soldeInitial + totalEntrees - totalSorties;
  }
  next();
});

module.exports = mongoose.model('Caisse', caisseSchema);