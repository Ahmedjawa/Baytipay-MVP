// Modèles MongoDB
const mongoose = require('mongoose');
// models/partie.model.js
const partieSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['client', 'fournisseur'],
    required: true
  },
  nom: {
    type: String,
    required: true
  },
  adresse: String,
  telephone: String,
  email: String,
  matriculeFiscale: String,
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dossiers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dossier'
  }]
}, { timestamps: true });

const Partie = mongoose.model('Partie', partieSchema);

// models/dossier.model.js
const dossierSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: true
  },
  description: String,
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateEcheance: Date,
  montantTotal: {
    type: Number,
    required: true
  },
  partieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partie',
    required: true
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  statut: {
    type: String,
    enum: ['en cours', 'terminé', 'annulé'],
    default: 'en cours'
  }
}, { timestamps: true });

const Dossier = mongoose.model('Dossier', dossierSchema);

// models/transaction.model.js
const transactionSchema = new mongoose.Schema({
  dossierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dossier',
    required: true
  },
  type: {
    type: String,
    enum: ['traite', 'chèque', 'espèce', 'virement'],
    required: true
  },
  montant: {
    type: Number,
    required: true
  },
  dateEcheance: {
    type: Date,
    required: true
  },
  statut: {
    type: String,
    enum: ['à payer', 'payé', 'impayé'],
    default: 'à payer'
  },
  imageUrl: String,
  numeroReference: String,
  notesSupplementaires: String
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

// models/caisse.model.js
const caisseSchema = new mongoose.Schema({
  semaine: {
    type: Number,
    required: true
  },
  annee: {
    type: Number,
    required: true
  },
  dateDebut: {
    type: Date,
    required: true
  },
  dateFin: {
    type: Date,
    required: true
  },
  soldeInitial: {
    type: Number,
    required: true,
    default: 0
  },
  soldeFinale: {
    type: Number,
    required: true,
    default: 0
  },
  entrees: [{
    date: Date,
    montant: Number,
    description: String,
    reference: String
  }],
  sorties: [{
    date: Date,
    montant: Number,
    description: String,
    reference: String
  }]
}, { timestamps: true });

const Caisse = mongoose.model('Caisse', caisseSchema);

// Service d'impression
const printService = {
  // Générer un PDF pour l'impression des traites/chèques
  generatePrintablePDF: async (transactionIds, format) => {
    try {
      // Récupérer les transactions demandées
      const transactions = await Transaction.find({
        _id: { $in: transactionIds }
      }).populate({
        path: 'dossierId',
        populate: {
          path: 'partieId'
        }
      });
      
      if (transactions.length === 0) {
        throw new Error("Aucune transaction trouvée");
      }
      
      // Ici, vous intégreriez une bibliothèque de génération PDF comme PDFKit ou jsPDF
      // Exemple simplifié
      const pdfData = "PDF généré (simulé)";
      
      return {
        success: true,
        data: pdfData,
        message: `${transactions.length} document(s) prêt(s) pour impression`
      };
    } catch (error) {
      throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
    }
  }
};