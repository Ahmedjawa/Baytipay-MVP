const mongoose = require('mongoose');

const correctionSchema = new mongoose.Schema({
  champ: { type: String, required: true },
  ancienneValeur: mongoose.Schema.Types.Mixed,
  nouvelleValeur: mongoose.Schema.Types.Mixed,
  date: { type: Date, default: Date.now },
  corrigePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const documentOCRSchema = new mongoose.Schema({
  fichierOriginal: { type: String, required: true },
  typeDocument: { 
    type: String, 
    enum: ['cheque', 'traite', 'facture', 'contrat'], 
    required: true 
  },
  donneesBrutes: { type: mongoose.Schema.Types.Mixed },
  donneesExtrait: {
    montant: Number,
    date: Date,
    beneficiaire: String,
    emetteur: String,
    numero: String,
    banque: String
  },
  statut: { 
    type: String, 
    enum: ['a_verifier', 'valide', 'rejete'], 
    default: 'a_verifier' 
  },
  dossierLie: { type: mongoose.Schema.Types.ObjectId, ref: 'Dossier' },
  echeanceLiee: { type: mongoose.Schema.Types.ObjectId, ref: 'Echeance' },
  corrections: [correctionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('DocumentOCR', documentOCRSchema);