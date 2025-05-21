// models/vente.model.js
const mongoose = require('mongoose');

const venteSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tiers',
    required: true
  },
  dateVente: {
    type: Date,
    default: Date.now
  },
  typeDocument: {
    type: String,
    enum: ['FACTURE_PROFORMA', 'BON_LIVRAISON', 'FACTURE', 'FACTURE_TTC', 'FACTURE_HT', 'FACTURE_RAS', 'FACTURE_FODEC', 'AVOIR'],
    required: true
  },
  documentSource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vente'
  },
  numeroDocument: {
    type: String
  },
  dateEcheance: {
    type: Date
  },
  modePaiement: {
    type: String,
    enum: ['ESPECES', 'CHEQUE_UNIQUE', 'EFFET_UNIQUE', 'CHEQUES_MULTIPLES', 'EFFETS_MULTIPLES', 'PAIEMENT_MIXTE', 'MIXTE'],
    required: true
  },
  remiseGlobale: {
    type: Number,
    default: 0
  },
  statut: {
    type: String,
    enum: ['BROUILLON', 'VALIDEE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'ANNULEE', 'TRANSFORME'],
    default: 'BROUILLON'
  },
  montantPaye: {
    type: Number,
    default: 0
  },
  resteAPayer: {
    type: Number,
    default: 0
  },
  notesInternes: {
    type: String
  },
  envoiFacture: {
    type: Boolean,
    default: false
  },
  dateEnvoiFacture: {
    type: Date
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

// Virtuals
venteSchema.virtual('transaction', {
  ref: 'Transaction',
  localField: 'transactionId',
  foreignField: '_id',
  justOne: true
});

venteSchema.virtual('client', {
  ref: 'Tiers',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

venteSchema.virtual('paiements', {
  ref: 'Paiement',
  localField: 'transactionId',
  foreignField: 'transactionId'
});

venteSchema.virtual('echeances', {
  ref: 'Echeance',
  localField: 'transactionId',
  foreignField: 'transactionId'
});

venteSchema.virtual('lignes', {
  ref: 'LigneTransaction',
  localField: 'transactionId',
  foreignField: 'transactionId'
});

// Méthode pour transformer un devis en bon de livraison
venteSchema.methods.transformerEnBonLivraison = async function() {
  if (this.typeDocument !== 'FACTURE_PROFORMA') {
    throw new Error('Seul un devis peut être transformé en bon de livraison');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Créer une nouvelle transaction pour le BL
    const Transaction = mongoose.model('Transaction');
    const transaction = new Transaction({
      type: 'VENTE',
      tiersId: this.clientId,
      numeroTransaction: `BL-${Date.now()}`,
      dateTransaction: new Date(),
      montantTotalHT: this.transaction.montantTotalHT,
      montantTotalTTC: this.transaction.montantTotalTTC,
      montantTaxes: this.transaction.montantTaxes,
      statut: 'BROUILLON',
      entrepriseId: this.entrepriseId,
      creePar: this.creePar
    });
    await transaction.save({ session });

    // 2. Copier les lignes de transaction
    const LigneTransaction = mongoose.model('LigneTransaction');
    const lignesOriginales = await LigneTransaction.find({ transactionId: this.transactionId });
    
    for (const ligne of lignesOriginales) {
      const nouvelleLigne = new LigneTransaction({
        transactionId: transaction._id,
        produitId: ligne.produitId,
        designation: ligne.designation,
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        remise: ligne.remise,
        montantHT: ligne.montantHT,
        montantTTC: ligne.montantTTC,
        entrepriseId: this.entrepriseId,
        creePar: this.creePar
      });
      await nouvelleLigne.save({ session });
    }

    // 3. Créer le bon de livraison
    const BonLivraison = mongoose.model('Vente');
    const bonLivraison = new BonLivraison({
      transactionId: transaction._id,
      clientId: this.clientId,
      dateVente: new Date(),
      typeDocument: 'BON_LIVRAISON',
      documentSource: this._id,
      numeroDocument: `BL-${Date.now()}`,
      modePaiement: this.modePaiement,
      remiseGlobale: this.remiseGlobale,
      statut: 'BROUILLON',
      montantPaye: 0,
      resteAPayer: transaction.montantTotalTTC,
      notesInternes: this.notesInternes,
      entrepriseId: this.entrepriseId,
      creePar: this.creePar
    });

    await bonLivraison.save({ session });
    await session.commitTransaction();

    return bonLivraison;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Méthode pour transformer un bon de livraison en facture
venteSchema.methods.transformerEnFacture = async function(modePaiement) {
  if (this.typeDocument !== 'BON_LIVRAISON') {
    throw new Error('Seul un bon de livraison peut être transformé en facture');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Créer une nouvelle transaction pour la facture
    const Transaction = mongoose.model('Transaction');
    const transaction = new Transaction({
      type: 'VENTE',
      tiersId: this.clientId,
      numeroTransaction: `F-${Date.now()}`,
      dateTransaction: new Date(),
      montantTotalHT: this.transaction.montantTotalHT,
      montantTotalTTC: this.transaction.montantTotalTTC,
      montantTaxes: this.transaction.montantTaxes,
      statut: 'BROUILLON',
      entrepriseId: this.entrepriseId,
      creePar: this.creePar
    });
    await transaction.save({ session });

    // 2. Copier les lignes de transaction
    const LigneTransaction = mongoose.model('LigneTransaction');
    const lignesOriginales = await LigneTransaction.find({ transactionId: this.transactionId });
    
    for (const ligne of lignesOriginales) {
      const nouvelleLigne = new LigneTransaction({
        transactionId: transaction._id,
        produitId: ligne.produitId,
        designation: ligne.designation,
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        remise: ligne.remise,
        montantHT: ligne.montantHT,
        montantTTC: ligne.montantTTC,
        entrepriseId: this.entrepriseId,
        creePar: this.creePar
      });
      await nouvelleLigne.save({ session });
    }

    // 3. Créer la facture
    const Facture = mongoose.model('Vente');
    const facture = new Facture({
      transactionId: transaction._id,
      clientId: this.clientId,
      dateVente: new Date(),
      typeDocument: 'FACTURE',
      documentSource: this._id,
      numeroDocument: `F-${Date.now()}`,
      modePaiement: modePaiement || this.modePaiement,
      remiseGlobale: this.remiseGlobale,
      statut: 'BROUILLON',
      montantPaye: 0,
      resteAPayer: transaction.montantTotalTTC,
      notesInternes: this.notesInternes,
      entrepriseId: this.entrepriseId,
      creePar: this.creePar
    });

    await facture.save({ session });

    // 4. Mettre à jour le statut du bon de livraison
    this.statut = 'TRANSFORME';
    await this.save({ session });

    await session.commitTransaction();
    return facture;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Middleware pour mettre à jour le statut en fonction des paiements
venteSchema.pre('save', async function(next) {
  // Ne mettre à jour le statut que pour les factures
  if (this.typeDocument !== 'FACTURE') {
    return next();
  }

  if (this.isModified('montantPaye') || this.isModified('resteAPayer')) {
    try {
      const Transaction = mongoose.model('Transaction');
      const transaction = await Transaction.findById(this.transactionId);
      
      if (transaction) {
        if (this.montantPaye <= 0) {
          this.statut = 'VALIDEE';
        } else if (this.montantPaye >= transaction.montantTotalTTC) {
          this.statut = 'PAYEE';
          this.resteAPayer = 0;
        } else {
          this.statut = 'PARTIELLEMENT_PAYEE';
          this.resteAPayer = transaction.montantTotalTTC - this.montantPaye;
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Méthode pour calculer le montant total payé
venteSchema.methods.calculerMontantPaye = async function() {
  const Paiement = mongoose.model('Paiement');
  const paiements = await Paiement.find({ venteId: this._id });
  return paiements.reduce((sum, p) => sum + p.montant, 0);
};

// Méthode pour vérifier si la vente est entièrement payée
venteSchema.methods.estEntierementPayee = async function() {
  const Transaction = mongoose.model('Transaction');
  const transaction = await Transaction.findById(this.transactionId);
  if (!transaction) return false;
  
  const montantPaye = await this.calculerMontantPaye();
  return montantPaye >= transaction.montantTotalTTC;
};

// Méthode pour mettre à jour le statut de la vente
venteSchema.methods.mettreAJourStatut = async function() {
  const montantPaye = await this.calculerMontantPaye();
  const Transaction = mongoose.model('Transaction');
  const transaction = await Transaction.findById(this.transactionId);
  
  if (!transaction) return;
  
  this.montantPaye = montantPaye;
  this.resteAPayer = transaction.montantTotalTTC - montantPaye;
  
  if (montantPaye <= 0) {
    this.statut = 'VALIDEE';
  } else if (montantPaye >= transaction.montantTotalTTC) {
    this.statut = 'PAYEE';
    this.resteAPayer = 0;
  } else {
    this.statut = 'PARTIELLEMENT_PAYEE';
  }
  
  await this.save();
};

// Méthode pour générer des documents complémentaires
venteSchema.methods.genererDocumentComplementaire = async function(typeDocument, options = {}) {
  if (this.typeDocument !== 'FACTURE') {
    throw new Error('Seule une facture peut générer des documents complémentaires');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Créer une nouvelle transaction pour le document complémentaire
    const Transaction = mongoose.model('Transaction');
    const transaction = new Transaction({
      type: 'DOCUMENT_COMPLEMENTAIRE',
      tiersId: this.clientId,
      numeroTransaction: `${typeDocument}-${Date.now()}`,
      dateTransaction: new Date(),
      montantTotalHT: this.transaction.montantTotalHT,
      montantTotalTTC: this.transaction.montantTotalTTC,
      montantTaxes: this.transaction.montantTaxes,
      statut: 'BROUILLON',
      entrepriseId: this.entrepriseId,
      creePar: this.creePar
    });
    await transaction.save({ session });

    // 2. Copier les lignes de transaction
    const LigneTransaction = mongoose.model('LigneTransaction');
    const lignesOriginales = await LigneTransaction.find({ transactionId: this.transactionId });
    
    for (const ligne of lignesOriginales) {
      const nouvelleLigne = new LigneTransaction({
        transactionId: transaction._id,
        produitId: ligne.produitId,
        designation: ligne.designation,
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        remise: ligne.remise,
        montantHT: ligne.montantHT,
        montantTTC: ligne.montantTTC,
        entrepriseId: this.entrepriseId,
        creePar: this.creePar
      });
      await nouvelleLigne.save({ session });
    }

    // 3. Créer le document complémentaire
    const DocumentComplementaire = mongoose.model('Vente');
    const documentComplementaire = new DocumentComplementaire({
      transactionId: transaction._id,
      clientId: this.clientId,
      dateVente: new Date(),
      typeDocument: typeDocument,
      documentSource: this._id,
      numeroDocument: `${typeDocument}-${Date.now()}`,
      modePaiement: this.modePaiement,
      remiseGlobale: this.remiseGlobale,
      statut: 'BROUILLON',
      montantPaye: 0,
      resteAPayer: transaction.montantTotalTTC,
      notesInternes: this.notesInternes,
      entrepriseId: this.entrepriseId,
      creePar: this.creePar
    });

    await documentComplementaire.save({ session });
    await session.commitTransaction();

    return documentComplementaire;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Index pour améliorer les performances
venteSchema.index({ transactionId: 1 }, { unique: true });
venteSchema.index({ clientId: 1 });
venteSchema.index({ dateVente: -1 });
venteSchema.index({ statut: 1, entrepriseId: 1 });

const Vente = mongoose.model('Vente', venteSchema, 'ventes');

module.exports = Vente;