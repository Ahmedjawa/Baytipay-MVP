// controllers/vente.controller.js
const Vente = require('../models/vente.model');
const Transaction = require('../models/transaction.model');
const Paiement = require('../models/paiement.model');
const LigneTransaction = require('../models/ligneTransaction.model');
const Echeancier = require('../models/echeancier.model');
const Echeance = require('../models/echeance.model');
const Tiers = require('../models/tiers.model');
const Article = require('../models/article.model'); // Ajout du modèle Article
const mongoose = require('mongoose');

// Helper function to handle errors
const handleError = (res, error) => {
  console.error('Error in vente controller:', error);
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({ message: 'Erreur de validation', errors: messages });
  }
  
  return res.status(500).json({ message: error.message || 'Une erreur est survenue' });
};

exports.getAllVentes = async (req, res) => {
  try {
    const { statut, dateDebut, dateFin, clientId } = req.query;
    const query = { entrepriseId: req.user.entrepriseId };
    
    if (statut) query.statut = statut;
    if (clientId) query.clientId = clientId;
    
    if (dateDebut || dateFin) {
      query.dateVente = {};
      if (dateDebut) query.dateVente.$gte = new Date(dateDebut);
      if (dateFin) query.dateVente.$lte = new Date(dateFin);
    }
    
    const ventes = await Vente.find(query)
      .populate('transactionId')
      .populate('clientId', 'nom prenom raisonSociale telephone email')
      .sort({ dateVente: -1 });
      
    res.json(ventes);
  } catch (error) {
    handleError(res, error);
  }
};

exports.getVenteById = async (req, res) => {
  try {
    const vente = await Vente.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    })
    .populate('transactionId')
    .populate('clientId')
    .populate({
      path: 'transaction',
      populate: {
        path: 'lignes'
      }
    })
    .populate('paiements')
    .populate('echeances');
    
    if (!vente) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }
    
    res.json(vente);
  } catch (error) {
    handleError(res, error);
  }
};

exports.createVente = async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Make sure to extract the user info correctly
    if (!req.user || !req.user.entrepriseId || !req.user._id) {
      throw new Error('Information utilisateur requise');
    }
    
    const entrepriseId = req.user.entrepriseId;
    const creePar = req.user._id;
    
    // 1. Create or get transaction
    let transaction;
    
    if (req.body.transactionId) {
      // Use existing transaction if ID provided
      transaction = await Transaction.findById(req.body.transactionId);
      if (!transaction) {
        throw new Error('Transaction non trouvée');
      }
    } else {
      // Create new transaction
      const transactionData = {
        type: 'VENTE',
        tiersId: req.body.clientId,
        entrepriseId,
        creePar,
        dateTransaction: req.body.dateVente || new Date(),
        montantTotalHT: req.body.montantTotalHT || 0,
        montantTotalTTC: req.body.montantTotalTTC || 0,
        montantTaxes: req.body.montantTaxes || 0,
        statut: 'VALIDEE',
        notes: req.body.notesInternes || ''
      };
      
      // Generate transaction number if not provided
      if (!transactionData.numeroTransaction) {
        transactionData.numeroTransaction = await Transaction.generateNumeroTransaction('VENTE', entrepriseId);
      }
      
      transaction = new Transaction(transactionData);
      await transaction.save({ session });
    }
    
    // 2. Create Vente record
    const venteData = {
      transactionId: transaction._id,
      clientId: req.body.clientId,
      dateVente: req.body.dateVente || new Date(),
      dateEcheance: req.body.dateEcheance,
      modePaiement: req.body.modePaiement,
      remiseGlobale: req.body.remiseGlobale || 0,
      statut: req.body.statut || 'VALIDEE',
      montantPaye: req.body.montantPaye || 0,
      resteAPayer: req.body.resteAPayer || transaction.montantTotalTTC,
      notesInternes: req.body.notesInternes,
      entrepriseId,
      creePar
    };
    
    const vente = new Vente(venteData);
    await vente.save({ session });
    
    // 3. Create Payment(s) if included
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
    
    // 4. Create Transaction Lines if included
    if (req.body.lignes && req.body.lignes.length > 0) {
      for (const ligneData of req.body.lignes) {
        const ligne = new LigneTransaction({
          transactionId: transaction._id,
          ...ligneData,
          entrepriseId,
          creePar
        });
        
   // ▼▼▼ Correction définitive ▼▼▼
    if (ligneData.produitId) { // produitId vient du modèle LigneTransaction
      const article = await Article.findById(ligneData.produitId).session(session);
      
      // Vérifier que c'est un PRODUIT physique
      if (article && article.type === 'PRODUIT') {
        await Article.findByIdAndUpdate(
          article._id, // ID de l'article dans la collection Article
          { $inc: { stock: -ligneData.quantite } },
          { session }
        );
      }
    }
  }
}
    
    // 5. Create Echeancier and Echeances if applicable
    let totalEcheances = 0;
    let echeancierCreated = null;
    
    if (req.body.echeancier && req.body.echeancier.echeances && req.body.echeancier.echeances.length > 0) {
      // Create the Echeancier record
      const echeancierData = {
        transactionId: transaction._id,
        venteId: vente._id,
        dateCreation: new Date(),
        montantTotal: req.body.echeancier.montantTotal,
        nombreEcheances: req.body.echeancier.nombreEcheances,
        statut: 'ACTIF',
        notesEcheancier: req.body.notesInternes,
        entrepriseId,
        creePar
      };
      
      const echeancier = new Echeancier(echeancierData);
      await echeancier.save({ session });
      echeancierCreated = echeancier;
      
      // Create individual Echeance records
      for (const echeanceData of req.body.echeancier.echeances) {
        const echeance = new Echeance({
          transactionId: transaction._id,
          echeancierID: echeancier._id,
          dateEcheance: echeanceData.dateEcheance,
          montant: echeanceData.montant,
          statut: 'A_RECEVOIR',
          reference: echeanceData.reference || `ECH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          banque: echeanceData.banque || '',
          type: echeanceData.type || determinerTypeParModePaiement(req.body.modePaiement),
          notes: echeanceData.notes || '',
          entrepriseId,
          tiersId: req.body.clientId
        });
        
        await echeance.save({ session });
        totalEcheances += parseFloat(echeance.montant);
      }
    }
    
    // 6. Update client balance
    await updateClientBalance(req.body.clientId, totalEcheances, session);
    
    // 7. Update vente.resteAPayer if we have echeances
    if (totalEcheances > 0) {
      vente.resteAPayer = totalEcheances;
      await vente.save({ session });
    }
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    // Return the created sale with populated data
    const createdVente = await Vente.findById(vente._id)
      .populate('transactionId')
      .populate('clientId');
      
    res.status(201).json(createdVente);
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    handleError(res, error);
  }
};

// Helper function to determine echéance type based on payment method
function determinerTypeParModePaiement(modePaiement) {
  if (modePaiement === 'CHEQUES_MULTIPLES' || modePaiement === 'CHEQUE_UNIQUE') {
    return 'CHEQUE';
  } else if (modePaiement === 'EFFETS_MULTIPLES' || modePaiement === 'EFFET_UNIQUE') {
    return 'EFFET';
  } else if (modePaiement === 'PAIEMENT_MIXTE') {
    return 'CHEQUE'; // Default for mixed payment
  } else {
    return 'AUTRE';
  }
}

// Helper function to update client balance with echéances (MODIFIÉ)
async function updateClientBalance(clientId, montantEcheances, session) {
  if (montantEcheances > 0) {
    const client = await Tiers.findById(clientId);
    if (client) {
      // Pour une vente avec échéances, nous diminuons le solde du client (il nous doit de l'argent)
      // On utilise un nombre négatif pour représenter une dette envers nous
      client.soldeCourant = (client.soldeCourant || 0) - montantEcheances;
      await client.save({ session });
    }
  }
}

exports.updateVente = async (req, res) => {
  try {
    // Check if sale exists and belongs to the user's enterprise
    const vente = await Vente.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!vente) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }
    
    // Don't allow changing critical fields
    const restrictedFields = ['entrepriseId', 'creePar', 'transactionId', 'clientId'];
    const updateData = Object.keys(req.body)
      .filter(key => !restrictedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
    
    // Update the sale
    const updatedVente = await Vente.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('transactionId').populate('clientId');
    
    res.json(updatedVente);
  } catch (error) {
    handleError(res, error);
  }
};

exports.deleteVente = async (req, res) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Check if the sale exists and belongs to the user's enterprise
    const vente = await Vente.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!vente) {
      return res.status(404).json({ message: 'Vente non trouvée' });
    }
    
    // Get all echéances to calculate the total to adjust client balance
    const echeances = await Echeance.find({ 
      transactionId: vente.transactionId,
      statut: 'A_RECEVOIR'
    });
    
    const totalEcheances = echeances.reduce((sum, echeance) => sum + echeance.montant, 0);
    
    // Update client balance if there are pending echéances
    if (totalEcheances > 0) {
      await updateClientBalanceOnDelete(vente.clientId, totalEcheances, session);
    }
    
    // Get transaction lines to restore article stock
    const lignesTransaction = await LigneTransaction.find({
      transactionId: vente.transactionId
    });
    
    // Restore article stock for each line
    for (const ligne of lignesTransaction) {
      if (ligne.articleId && ligne.quantite > 0) {
        await restoreArticleStock(ligne.articleId, ligne.quantite, session);
      }
    }
    
    // Delete echéancier and echéances
    await Echeancier.deleteMany({ venteId: vente._id }, { session });
    await Echeance.deleteMany({ transactionId: vente.transactionId }, { session });
    
    // Delete related records
    await Paiement.deleteMany({ transactionId: vente.transactionId }, { session });
    await LigneTransaction.deleteMany({ transactionId: vente.transactionId }, { session });
    
    // Delete the sale
    await Vente.findByIdAndDelete(req.params.id, { session });
    
    // Delete the transaction
    await Transaction.findByIdAndDelete(vente.transactionId, { session });
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    res.json({ message: 'Vente supprimée avec succès' });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    handleError(res, error);
  }
};

// Helper function to update client balance when deleting a sale (MODIFIÉ)
async function updateClientBalanceOnDelete(clientId, montantEcheances, session) {
  if (montantEcheances > 0) {
    const client = await Tiers.findById(clientId);
    if (client) {
      // Pour une vente supprimée, augmentons le solde du client (il nous doit moins)
      client.soldeCourant = (client.soldeCourant || 0) + montantEcheances;
      await client.save({ session });
    }
  }
}

// Helper function to restore article stock when deleting a sale (NOUVEAU)
async function restoreArticleStock(articleId, quantite, session) {
  const article = await Article.findById(articleId);
  if (article) {
    // Réaugmenter le stock de l'article lors de la suppression d'une vente
    article.stock = article.stock + quantite;
    await article.save({ session });
  }
}