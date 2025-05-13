// controllers/achat.controller.js
const Achat = require('../models/achat.model');
const Transaction = require('../models/transaction.model');
const Paiement = require('../models/paiement.model');
const LigneTransaction = require('../models/ligneTransaction.model');
const Echeancier = require('../models/echeancier.model');
const Echeance = require('../models/echeance.model');
const Tiers = require('../models/tiers.model');
const Article = require('../models/article.model');
const mongoose = require('mongoose');

// Helper function to handle errors
const handleError = (res, error) => {
  console.error('Error in achat controller:', error);
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({ message: 'Erreur de validation', errors: messages });
  }
  
  return res.status(500).json({ message: error.message || 'Une erreur est survenue' });
};

exports.getAllAchats = async (req, res) => {
  try {
    const { statut, dateDebut, dateFin, fournisseurId } = req.query;
    const query = { entrepriseId: req.user.entrepriseId };
    
    if (statut) query.statut = statut;
    if (fournisseurId) query.fournisseurId = fournisseurId;
    
    if (dateDebut || dateFin) {
      query.dateAchat = {};
      if (dateDebut) query.dateAchat.$gte = new Date(dateDebut);
      if (dateFin) query.dateAchat.$lte = new Date(dateFin);
    }
    
    const achats = await Achat.find(query)
      .populate('transactionId')
      .populate('fournisseurId', 'nom prenom raisonSociale telephone email')
      .sort({ dateAchat: -1 });
      
    res.json(achats);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getAchatById = async (req, res) => {
  try {
    const achat = await Achat.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    })
    .populate('transactionId')
    .populate('fournisseurId')
    .populate({
      path: 'transaction',
      populate: {
        path: 'lignes'
      }
    })
    .populate('paiements')
    .populate('echeances');
    
    if (!achat) {
      return res.status(404).json({ message: 'Achat non trouvé' });
    }
    
    res.json(achat);
  } catch (error) {
    handleError(res, error);
  }
};

exports.createAchat = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    if (!req.user || !req.user.entrepriseId || !req.user._id) {
      throw new Error('Information utilisateur requise');
    }
    
    const entrepriseId = req.user.entrepriseId;
    const creePar = req.user._id;
    
    // 1. Création de la transaction
    let transaction;
    const transactionData = {
      type: 'ACHAT',
      tiersId: req.body.fournisseurId,
      entrepriseId,
      creePar,
      dateTransaction: req.body.dateAchat || new Date(),
      montantTotalHT: req.body.montantTotalHT || 0,
      montantTotalTTC: req.body.montantTotalTTC || 0,
      montantTaxes: req.body.montantTaxes || 0,
      statut: 'VALIDEE',
      notes: req.body.notesInternes || ''
    };
    
    if (!transactionData.numeroTransaction) {
      transactionData.numeroTransaction = await Transaction.generateNumeroTransaction('ACHAT', entrepriseId);
    }
    
    transaction = new Transaction(transactionData);
    await transaction.save({ session });
    
    // 2. Création de l'achat
    const achatData = {
      transactionId: transaction._id,
      fournisseurId: req.body.fournisseurId,
      dateAchat: req.body.dateAchat || new Date(),
      documents: req.body.documents || [],
      statut: req.body.statut || 'VALIDEE',
      notesInternes: req.body.notesInternes,
      entrepriseId,
      creePar
    };
    
    const achat = new Achat(achatData);
    await achat.save({ session });
    
    // 3. Gestion des paiements
    if (req.body.paiements && req.body.paiements.length > 0) {
      for (const paiementData of req.body.paiements) {
        const paiement = new Paiement({
          transactionId: transaction._id,
          ...paiementData,
          entrepriseId,
          creePar
        });
        await paiement.save({ session });
      }
    }
    
    // 4. Gestion des lignes de transaction et stock
    if (req.body.lignes && req.body.lignes.length > 0) {
      for (const ligneData of req.body.lignes) {
        const ligne = new LigneTransaction({
          transactionId: transaction._id,
          ...ligneData,
          entrepriseId,
          creePar
        });
        
        if (ligneData.produitId) {
          const article = await Article.findById(ligneData.produitId).session(session);
          if (article && article.type === 'PRODUIT') {
            await Article.findByIdAndUpdate(
              article._id,
              { $inc: { stock: ligneData.quantite } }, // Incrémentation du stock
              { session }
            );
          }
        }
        await ligne.save({ session });
      }
    }
    
    // 5. Gestion des échéanciers
    let totalEcheances = 0;
    if (req.body.echeancier && req.body.echeancier.echeances) {
      const echeancier = new Echeancier({
        transactionId: transaction._id,
        venteId: achat._id,
        ...req.body.echeancier,
        entrepriseId,
        creePar
      });
      await echeancier.save({ session });
      
      for (const echeanceData of req.body.echeancier.echeances) {
        const echeance = new Echeance({
          transactionId: transaction._id,
          echeancierID: echeancier._id,
          ...echeanceData,
          statut: 'A_PAYER',
          type: determinerTypeAchat(echeanceData.typePaiement),
          entrepriseId,
          tiersId: req.body.fournisseurId
        });
        await echeance.save({ session });
        totalEcheances += echeance.montant;
      }
    }
    
    // 6. Mise à jour du solde fournisseur
    await updateFournisseurBalance(req.body.fournisseurId, totalEcheances, session);
    
    await session.commitTransaction();
    session.endSession();
    
    const createdAchat = await Achat.findById(achat._id)
      .populate('transactionId')
      .populate('fournisseurId');
      
    res.status(201).json(createdAchat);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    handleError(res, error);
  }
};

exports.updateAchat = async (req, res) => {
  try {
    const achat = await Achat.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!achat) {
      return res.status(404).json({ message: 'Achat non trouvé' });
    }
    
    const restrictedFields = ['entrepriseId', 'creePar', 'transactionId', 'fournisseurId'];
    const updateData = Object.keys(req.body)
      .filter(key => !restrictedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
    
    const updatedAchat = await Achat.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('transactionId').populate('fournisseurId');
    
    res.json(updatedAchat);
  } catch (error) {
    handleError(res, error);
  }
};

exports.deleteAchat = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const achat = await Achat.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!achat) {
      return res.status(404).json({ message: 'Achat non trouvé' });
    }
    
    // Restaurer le stock
    const lignes = await LigneTransaction.find({ transactionId: achat.transactionId });
    for (const ligne of lignes) {
      if (ligne.produitId) {
        await Article.findByIdAndUpdate(
          ligne.produitId,
          { $inc: { stock: -ligne.quantite } }, // Décrémentation du stock
          { session }
        );
      }
    }
    
    // Suppression des données liées
    await Echeancier.deleteMany({ venteId: achat._id }, { session });
    await Echeance.deleteMany({ transactionId: achat.transactionId }, { session });
    await Paiement.deleteMany({ transactionId: achat.transactionId }, { session });
    await LigneTransaction.deleteMany({ transactionId: achat.transactionId }, { session });
    
    await Achat.findByIdAndDelete(achat._id, { session });
    await Transaction.findByIdAndDelete(achat.transactionId, { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({ message: 'Achat supprimé avec succès' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    handleError(res, error);
  }
};

// Helpers spécifiques aux achats
function determinerTypeAchat(modePaiement) {
  const mapping = {
    'cheque': 'CHEQUE',
    'virement': 'VIREMENT',
    'effet': 'EFFET'
  };
  return mapping[modePaiement] || 'AUTRE';
}

async function updateFournisseurBalance(fournisseurId, montantEcheances, session) {
  if (montantEcheances > 0) {
    const fournisseur = await Tiers.findById(fournisseurId).session(session);
    if (fournisseur) {
      fournisseur.soldeCourant = (fournisseur.soldeCourant || 0) + montantEcheances;
      await fournisseur.save({ session });
    }
  }
}