// models/depense.model.js
const mongoose = require('mongoose');

const DepenseSchema = new mongoose.Schema({
  categorieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CategorieDepense',
    required: [true, 'La catégorie est obligatoire']
  },
  tiersId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tiers'
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est obligatoire'],
    min: [0.01, 'Le montant doit être supérieur à 0']
  },
  dateDepense: {
    type: Date,
    required: [true, 'La date de dépense est obligatoire'],
    default: Date.now
  },
  datePaiement: {
    type: Date
  },
  description: {
    type: String,
    required: [true, 'La description est obligatoire'],
    trim: true
  },
  referencePaiement: {
    type: String,
    trim: true
  },
  recurrente: {
    type: Boolean,
    default: false
  },
  frequence: {
    type: String,
    enum: ['QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE', 'ANNUELLE'],
    required: function() { return this.recurrente; }
  },
  debutRecurrence: {
    type: Date,
    required: function() { return this.recurrente; }
  },
  finRecurrence: {
    type: Date
  },
  prochaineOccurrence: {
    type: Date
  },
  statut: {
    type: String,
    enum: ['EN_COURS', 'PAYEE', 'ANNULEE'],
    default: 'EN_COURS'
  },
  notificationDelai: {
    type: Number,
    default: 3, // Nombre de jours avant l'échéance pour notifier
    min: 0,
    max: 30
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
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }
}, {
  timestamps: true
});

// Middleware pour calculer la prochaine occurrence lors de l'enregistrement
DepenseSchema.pre('save', function(next) {
  if (this.recurrente && (this.isNew || this.isModified('debutRecurrence') || 
      this.isModified('frequence') || this.isModified('prochaineOccurrence'))) {
      
    const aujourdhui = new Date();
    let prochaine = this.prochaineOccurrence;
    
    if (!prochaine || prochaine < aujourdhui) {
      prochaine = new Date(this.debutRecurrence);
      
      while (prochaine < aujourdhui) {
        switch (this.frequence) {
          case 'QUOTIDIENNE':
            prochaine.setDate(prochaine.getDate() + 1);
            break;
          case 'HEBDOMADAIRE':
            prochaine.setDate(prochaine.getDate() + 7);
            break;
          case 'MENSUELLE':
            prochaine.setMonth(prochaine.getMonth() + 1);
            break;
          case 'ANNUELLE':
            prochaine.setFullYear(prochaine.getFullYear() + 1);
            break;
        }
      }
      
      this.prochaineOccurrence = prochaine;
    }
  }
  next();
});

// Index pour améliorer les performances
DepenseSchema.index({ categorieId: 1 });
DepenseSchema.index({ tiersId: 1 });
DepenseSchema.index({ dateDepense: -1 });
DepenseSchema.index({ recurrente: 1, prochaineOccurrence: 1 });
DepenseSchema.index({ entrepriseId: 1, statut: 1 });

module.exports = mongoose.model('Depense', DepenseSchema, 'depenses');