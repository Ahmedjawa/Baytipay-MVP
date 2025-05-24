// controllers/vente.controller.js
const Vente = require('../models/vente.model');
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
  console.error('Error in vente controller:', error);
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({ message: 'Erreur de validation', errors: messages });
  }
  
  return res.status(500).json({ message: error.message || 'Une erreur est survenue' });
};

// Get all ventes with filters
exports.getAllVentes = async (req, res) => {
  try {
    const {
      dateDebut,
      dateFin,
      statut,
      typeDocument,
      q,
      populate
    } = req.query;

    // Construire le filtre
    const filter = {};

    // Filtre par date
    if (dateDebut && dateFin) {
      filter.dateVente = {
        $gte: new Date(dateDebut),
        $lte: new Date(dateFin)
      };
    }

    // Filtre par statut
    if (statut) {
      filter.statut = statut;
    }

    // Filtre par type de document
    if (typeDocument) {
      filter.typeDocument = typeDocument;
    }

    // Filtre par recherche
    if (q) {
      filter.$or = [
        { numeroDocument: { $regex: q, $options: 'i' } },
        { 'client.raisonSociale': { $regex: q, $options: 'i' } },
        { 'client.nom': { $regex: q, $options: 'i' } },
        { 'client.prenom': { $regex: q, $options: 'i' } }
      ];
    }

    // Construire les options de population
    const populateOptions = [];
    if (populate) {
      const relations = populate.split(',');
      relations.forEach(relation => {
        switch (relation) {
          case 'transaction':
            populateOptions.push({
              path: 'transaction',
              select: 'montantTotalHT montantTotalTTC montantTaxes numeroTransaction'
            });
            break;
          case 'client':
            populateOptions.push({
              path: 'client',
              select: 'raisonSociale nom prenom'
            });
            break;
        }
      });
    }

    // Récupérer les ventes avec les relations
    const ventes = await Vente.find(filter)
      .populate(populateOptions)
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
        path: 'lignes',
        options: { strictPopulate: false }
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { clientId, lignes, modePaiement, paiementDetails, echeancier, notes, typeDocument } = req.body;
    const entrepriseId = req.user.entrepriseId;
    const creePar = req.user._id;

    console.log('Création de vente avec les données:', {
      typeDocument,
      modePaiement,
      nombreLignes: lignes?.length
    });

    // Vérifier le stock disponible pour chaque article
    for (const ligne of lignes) {
      if (ligne.articleId) {
        const article = await Article.findById(ligne.articleId);
        if (article && article.type === 'PRODUIT') {
          if (article.stock < ligne.quantite) {
            throw new Error(`Stock insuffisant pour l'article ${article.designation}. Stock disponible: ${article.stock}, Quantité demandée: ${ligne.quantite}`);
          }
        }
      }
    }

    // 1. Créer la transaction
    const transaction = new Transaction({
      type: 'VENTE',
      tiersId: clientId,
      numeroTransaction: `V-${Date.now()}`,
      dateTransaction: new Date(),
      montantTotalHT: lignes.reduce((sum, ligne) => sum + (ligne.montantHT || 0), 0),
      montantTotalTTC: lignes.reduce((sum, ligne) => sum + (ligne.montantTTC || 0), 0),
      montantTaxes: lignes.reduce((sum, ligne) => sum + (ligne.montantTaxes || 0), 0),
      statut: 'BROUILLON',
      entrepriseId,
      creePar
    });

    await transaction.save({ session });

    // 2. Créer les lignes de transaction
    for (const ligne of lignes) {
      const ligneTransaction = new LigneTransaction({
        transactionId: transaction._id,
        articleId: ligne.articleId,
        designation: ligne.designation,
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        remise: ligne.remise || 0,
        montantHT: ligne.montantHT,
        montantTTC: ligne.montantTTC,
        entrepriseId,
        creePar
      });
      await ligneTransaction.save({ session });
    }

    // 3. Créer la vente
    const vente = new Vente({
      transactionId: transaction._id,
      clientId,
      dateVente: new Date(),
      typeDocument: typeDocument,
      numeroDocument: typeDocument === 'FACTURE' ? `F-${Date.now()}` : 
                     typeDocument === 'BON_LIVRAISON' ? `BL-${Date.now()}` : 
                     typeDocument === 'FACTURE_PROFORMA' ? `DP-${Date.now()}` :
                     `F-${Date.now()}`,
      modePaiement: modePaiement || 'ESPECES',
      remiseGlobale: lignes.reduce((sum, ligne) => sum + (ligne.remise || 0), 0),
      statut: 'BROUILLON',
      montantPaye: 0,
      resteAPayer: transaction.montantTotalTTC,
      notesInternes: notes || '',
      entrepriseId,
      creePar
    });

    await vente.save({ session });

    console.log('Vente créée avec succès:', {
      id: vente._id,
      typeDocument: vente.typeDocument,
      numeroDocument: vente.numeroDocument
    });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: {
        vente,
        transaction
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la vente:', error);
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Valider une vente
exports.validerVente = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { venteId } = req.params;
    const entrepriseId = req.user.entrepriseId;

    const vente = await Vente.findOne({ _id: venteId, entrepriseId });
    if (!vente) {
      throw new Error('Vente non trouvée');
    }

    const transaction = await Transaction.findById(vente.transactionId);
    if (!transaction) {
      throw new Error('Transaction non trouvée');
    }

    // Vérifier que tous les paiements sont en ordre
    const paiements = await Paiement.find({ venteId: vente._id });
    const montantTotalPaye = paiements.reduce((sum, p) => sum + p.montant, 0);

    // Mettre à jour les statuts
    vente.montantPaye = montantTotalPaye;
    vente.resteAPayer = transaction.montantTotalTTC - montantTotalPaye;
    
    if (montantTotalPaye >= transaction.montantTotalTTC) {
      vente.statut = 'PAYEE';
      transaction.statut = 'VALIDEE';
    } else if (montantTotalPaye > 0) {
      vente.statut = 'PARTIELLEMENT_PAYEE';
      transaction.statut = 'VALIDEE';
    } else {
      vente.statut = 'VALIDEE';
      transaction.statut = 'VALIDEE';
    }

    await vente.save({ session });
    await transaction.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: {
        vente,
        transaction
      }
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

exports.updateVente = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('Mise à jour de la vente:', {
      id,
      typeDocument: updateData.typeDocument,
      entrepriseId: updateData.entrepriseId,
      creePar: updateData.creePar
    });

    // Vérifier que la vente existe
    const vente = await Vente.findById(id);
    if (!vente) {
      throw new Error('Vente non trouvée');
    }

    // Vérifier que l'utilisateur a le droit de modifier cette vente
    if (vente.entrepriseId.toString() !== updateData.entrepriseId) {
      throw new Error('Non autorisé à modifier cette vente');
    }

    // Vérifier le type de document
    if (updateData.typeDocument && !['FACTURE_PROFORMA', 'FACTURE', 'BON_LIVRAISON'].includes(updateData.typeDocument)) {
      throw new Error('Type de document invalide');
    }

    // Mettre à jour la vente
    const updatedVente = await Vente.findByIdAndUpdate(
      id,
      { 
        $set: {
          ...updateData,
          modifieLe: new Date()
        }
      },
      { new: true, session }
    );

    console.log('Vente mise à jour avec succès:', {
      id: updatedVente._id,
      typeDocument: updatedVente.typeDocument
    });

    await session.commitTransaction();
    res.json({
      success: true,
      data: {
        vente: updatedVente
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Erreur lors de la mise à jour de la vente:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour de la vente'
    });
  } finally {
    session.endSession();
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
    }).session(session);
    
    if (!vente) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Vente non trouvée' });
    }
    
    // Get all echéances to calculate the total to adjust client balance
    const echeances = await Echeance.find({ 
      transactionId: vente.transactionId,
      statut: 'A_RECEVOIR'
    }).session(session);
    
    const totalEcheances = echeances.reduce((sum, echeance) => sum + echeance.montant, 0);
    
    // Update client balance if there are pending echéances
    if (totalEcheances > 0) {
      await updateClientBalanceOnDelete(vente.clientId, totalEcheances, session);
    }
    
    // Get transaction lines to restore article stock
    const lignesTransaction = await LigneTransaction.find({
      transactionId: vente.transactionId
    }).session(session);
    
    // Restore article stock for each line
    for (const ligne of lignesTransaction) {
      const articleId = ligne.articleId || ligne.produitId;
      
      if (articleId) {
        const article = await Article.findById(articleId).session(session);
        
        if (article && article.type === 'PRODUIT') {
          console.log(`Restauration du stock pour l'article ${article._id}, ancienne valeur: ${article.stock}, quantité à ajouter: ${ligne.quantite}`);
          
          await Article.findByIdAndUpdate(
            article._id,
            { $inc: { stock: ligne.quantite } },
            { session }
          );
        }
      }
    }
    
    // Delete related records
    await Echeancier.deleteMany({ venteId: vente._id }, { session });
    await Echeance.deleteMany({ transactionId: vente.transactionId }, { session });
    await Paiement.deleteMany({ transactionId: vente.transactionId }, { session });
    await LigneTransaction.deleteMany({ transactionId: vente.transactionId }, { session });
    
    // Delete the sale and transaction
    await Vente.findByIdAndDelete(req.params.id, { session });
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

// Helper function to update client balance when deleting a sale
async function updateClientBalanceOnDelete(clientId, montantEcheances, session) {
  if (montantEcheances > 0) {
    const client = await Tiers.findById(clientId).session(session);
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

// Transformer un devis en bon de livraison
exports.transformerEnBonLivraison = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: venteId } = req.params;
    const entrepriseId = req.user.entrepriseId;

    console.log('Recherche du devis:', { venteId, entrepriseId });

    // Récupérer le devis avec toutes ses données
    const devis = await Vente.findOne({ 
      _id: venteId, 
      entrepriseId
    })
    .populate('clientId')
    .populate({
      path: 'transactionId',
      populate: {
        path: 'lignesTransaction',
        populate: {
          path: 'articleId'
        },
        options: { strictPopulate: false }
      }
    });

    if (!devis) {
      throw new Error('Devis non trouvé');
    }

    console.log('Devis trouvé:', { 
      id: devis._id,
      typeDocument: devis.typeDocument,
      statut: devis.statut
    });

    // Vérification du type de document
    if (devis.typeDocument !== 'FACTURE_PROFORMA') {
      throw new Error(`Le document doit être un devis pour être transformé en bon de livraison. Type actuel: ${devis.typeDocument}`);
    }

    // Créer une nouvelle transaction pour le bon de livraison
    const transaction = new Transaction({
      type: 'VENTE',
      tiersId: devis.clientId._id,
      numeroTransaction: `V-${Date.now()}`,
      dateTransaction: new Date(),
      montantTotalHT: devis.transactionId.montantTotalHT,
      montantTotalTTC: devis.transactionId.montantTotalTTC,
      montantTaxes: devis.transactionId.montantTaxes,
      statut: 'BROUILLON',
      entrepriseId,
      creePar: req.user._id
    });

    await transaction.save({ session });

    // Créer les lignes de transaction
    for (const ligne of devis.transactionId.lignesTransaction) {
      const ligneTransaction = new LigneTransaction({
        transactionId: transaction._id,
        articleId: ligne.articleId._id,
        designation: ligne.designation,
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        remise: ligne.remise || 0,
        montantHT: ligne.montantHT,
        montantTTC: ligne.montantTTC,
        entrepriseId,
        creePar: req.user._id
      });
      await ligneTransaction.save({ session });
    }

    // Créer le bon de livraison
    const bonLivraison = new Vente({
      transactionId: transaction._id,
      clientId: devis.clientId._id,
      dateVente: new Date(),
      typeDocument: 'BON_LIVRAISON',
      numeroDocument: `BL-${Date.now()}`,
      modePaiement: devis.modePaiement,
      remiseGlobale: devis.remiseGlobale,
      statut: 'BROUILLON',
      montantPaye: 0,
      resteAPayer: transaction.montantTotalTTC,
      notesInternes: devis.notesInternes,
      documentSource: devis._id,
      entrepriseId,
      creePar: req.user._id
    });

    await bonLivraison.save({ session });

    // Mettre à jour le statut du devis
    devis.statut = 'TRANSFORME';
    await devis.save({ session });

    await session.commitTransaction();

    // Récupérer le bon de livraison avec toutes ses données
    const bonLivraisonPopule = await Vente.findById(bonLivraison._id)
      .populate('clientId')
      .populate({
        path: 'transactionId',
        populate: {
          path: 'lignesTransaction',
          populate: {
            path: 'articleId'
          },
          options: { strictPopulate: false }
        }
      });

    console.log('Bon de livraison créé avec succès:', {
      id: bonLivraison._id,
      typeDocument: bonLivraison.typeDocument,
      numeroDocument: bonLivraison.numeroDocument
    });

    res.status(200).json({
      success: true,
      data: {
        vente: bonLivraisonPopule,
        transaction
      }
    });

  } catch (error) {
    console.error('Erreur lors de la transformation:', error);
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Transformer un bon de livraison en facture
exports.transformerEnFacture = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { venteId } = req.params;
    const { modePaiement } = req.body;
    const entrepriseId = req.user.entrepriseId;

    const bonLivraison = await Vente.findOne({ 
      _id: venteId, 
      entrepriseId,
      typeDocument: 'BON_LIVRAISON'
    });

    if (!bonLivraison) {
      throw new Error('Bon de livraison non trouvé');
    }

    const facture = await bonLivraison.transformerEnFacture(modePaiement);
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      data: facture
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Transformer plusieurs devis en bons de livraison
exports.transformerDevisEnBL = async (req, res) => {
  try {
    const { devisIds } = req.body;
    const entrepriseId = req.user.entrepriseId;

    if (!devisIds || !Array.isArray(devisIds) || devisIds.length === 0) {
      throw new Error('Aucun devis sélectionné');
    }

    // Récupérer tous les devis avec leurs données complètes
    const devisList = await Vente.find({ 
      _id: { $in: devisIds }, 
      entrepriseId,
      typeDocument: 'FACTURE_PROFORMA',
      statut: { $ne: 'TRANSFORME' } // Ne pas inclure les devis déjà transformés
    })
    .populate('clientId')
    .populate({
      path: 'transactionId',
      populate: {
        path: 'lignesTransaction',
        populate: {
          path: 'articleId'
        },
        options: { strictPopulate: false }
      }
    });

    if (devisList.length === 0) {
      throw new Error('Aucun devis trouvé ou tous les devis ont déjà été transformés');
    }

    // Vérifier que tous les devis sont du même client
    const clientId = devisList[0].clientId?._id;
    if (!clientId) {
      throw new Error('Client non trouvé pour le premier devis');
    }

    const sameClient = devisList.every(d => d.clientId?._id?.toString() === clientId.toString());
    if (!sameClient) {
      throw new Error('Tous les devis doivent être du même client');
    }

    // Préparer les données pour le nouveau bon de livraison
    const bonLivraisonData = {
      clientId: clientId,
      dateVente: new Date(),
      typeDocument: 'BON_LIVRAISON',
      numeroDocument: `BL-${Date.now()}`,
      modePaiement: 'ESPECES', // Valeur par défaut
      remiseGlobale: 0,
      statut: 'BROUILLON',
      montantPaye: 0,
      resteAPayer: 0,
      notesInternes: '',
      entrepriseId,
      creePar: req.user._id,
      documentSource: devisList[0]._id, // Référence au premier devis
      lignesTransaction: []
    };

    // Agréger les lignes de transaction de tous les devis
    for (const devis of devisList) {
      if (devis.transactionId?.lignesTransaction) {
        bonLivraisonData.lignesTransaction.push(...devis.transactionId.lignesTransaction.map(ligne => ({
          articleId: ligne.articleId?._id,
          designation: ligne.designation,
          description: ligne.description,
          quantite: ligne.quantite,
          unite: ligne.unite,
          prixUnitaireHT: ligne.prixUnitaireHT,
          tauxTVA: ligne.tauxTVA,
          remise: ligne.remise,
          montantHT: ligne.montantHT,
          montantTVA: ligne.montantTVA,
          montantTTC: ligne.montantTTC,
          observations: ligne.observations
        })));
      }
    }

    // Calculer les totaux
    bonLivraisonData.montantTotalHT = bonLivraisonData.lignesTransaction.reduce((sum, ligne) => sum + (ligne.montantHT || 0), 0);
    bonLivraisonData.montantTotalTTC = bonLivraisonData.lignesTransaction.reduce((sum, ligne) => sum + (ligne.montantTTC || 0), 0);
    bonLivraisonData.montantTaxes = bonLivraisonData.lignesTransaction.reduce((sum, ligne) => sum + (ligne.montantTVA || 0), 0);
    bonLivraisonData.resteAPayer = bonLivraisonData.montantTotalTTC;

    res.status(200).json({
      success: true,
      data: {
        bonLivraisonData,
        devisIds: devisList.map(d => d._id) // Retourner les IDs des devis pour référence
      }
    });

  } catch (error) {
    console.error('Erreur lors de la préparation de la transformation:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Transformer plusieurs bons de livraison en factures
exports.transformerBLEnFactures = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { blIds, modePaiement } = req.body;
    const entrepriseId = req.user.entrepriseId;
    const factures = [];

    for (const blId of blIds) {
      const bl = await Vente.findOne({ _id: blId, entrepriseId });
      if (!bl) {
        throw new Error(`Bon de livraison non trouvé: ${blId}`);
      }

      const facture = await bl.transformerEnFacture(modePaiement);
      factures.push(facture);
    }

    await session.commitTransaction();
    res.json({ success: true, data: factures });
  } catch (error) {
    await session.abortTransaction();
    handleError(res, error);
  } finally {
    session.endSession();
  }
};

// Sauvegarder le bon de livraison après transformation
exports.sauvegarderBonLivraison = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bonLivraisonData, devisIds } = req.body;
    const entrepriseId = req.user.entrepriseId;

    if (!bonLivraisonData || !devisIds || !Array.isArray(devisIds)) {
      throw new Error('Données invalides pour la création du bon de livraison');
    }

    // Vérifier que les devis existent et n'ont pas déjà été transformés
    const devisList = await Vente.find({
      _id: { $in: devisIds },
      entrepriseId,
      typeDocument: 'FACTURE_PROFORMA',
      statut: { $ne: 'TRANSFORME' }
    });

    if (devisList.length === 0) {
      throw new Error('Aucun devis valide trouvé pour la transformation');
    }

    // Créer la transaction
    const transaction = new Transaction({
      type: 'VENTE',
      tiersId: bonLivraisonData.clientId,
      numeroTransaction: `V-${Date.now()}`,
      dateTransaction: new Date(),
      montantTotalHT: bonLivraisonData.montantTotalHT,
      montantTotalTTC: bonLivraisonData.montantTotalTTC,
      montantTaxes: bonLivraisonData.montantTaxes,
      statut: 'BROUILLON',
      entrepriseId,
      creePar: req.user._id
    });

    await transaction.save({ session });

    // Créer les lignes de transaction
    for (const ligne of bonLivraisonData.lignesTransaction) {
      const ligneTransaction = new LigneTransaction({
        transactionId: transaction._id,
        articleId: ligne.articleId,
        designation: ligne.designation,
        description: ligne.description,
        quantite: ligne.quantite,
        unite: ligne.unite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tauxTVA: ligne.tauxTVA,
        remise: ligne.remise,
        montantHT: ligne.montantHT,
        montantTVA: ligne.montantTVA,
        montantTTC: ligne.montantTTC,
        observations: ligne.observations,
        entrepriseId,
        creePar: req.user._id
      });
      await ligneTransaction.save({ session });
    }

    // Créer le bon de livraison
    const bonLivraison = new Vente({
      transactionId: transaction._id,
      clientId: bonLivraisonData.clientId,
      dateVente: new Date(),
      typeDocument: 'BON_LIVRAISON',
      numeroDocument: bonLivraisonData.numeroDocument,
      modePaiement: bonLivraisonData.modePaiement,
      remiseGlobale: bonLivraisonData.remiseGlobale,
      statut: 'BROUILLON',
      montantPaye: 0,
      resteAPayer: bonLivraisonData.montantTotalTTC,
      notesInternes: bonLivraisonData.notesInternes,
      documentSource: devisList[0]._id,
      entrepriseId,
      creePar: req.user._id
    });

    await bonLivraison.save({ session });

    // Mettre à jour le statut des devis
    for (const devis of devisList) {
      devis.statut = 'TRANSFORME';
      await devis.save({ session });
    }

    await session.commitTransaction();

    // Récupérer le bon de livraison avec toutes ses données
    const bonLivraisonPopule = await Vente.findById(bonLivraison._id)
      .populate('clientId')
      .populate({
        path: 'transactionId',
        populate: {
          path: 'lignesTransaction',
          populate: {
            path: 'articleId'
          },
          options: { strictPopulate: false }
        }
      });

    res.status(200).json({
      success: true,
      data: {
        bonLivraison: bonLivraisonPopule,
        message: 'Bon de livraison créé avec succès'
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Erreur lors de la sauvegarde du bon de livraison:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * Transformer plusieurs documents sources en un seul document cible
 * @param {Object} req - Requête Express contenant les IDs des documents sources et les types source/cible
 * @param {Object} res - Réponse Express
 */
exports.transformerDocuments = async (req, res) => {
  try {
    const { documentIds, sourceType, targetType } = req.body;
    
    console.log('Requête de transformation reçue:', { documentIds, sourceType, targetType });
    
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Liste des IDs de documents invalide'
      });
    }
    
    if (!sourceType || !targetType) {
      return res.status(400).json({
        success: false,
        error: 'Types de documents source et cible requis'
      });
    }
    
    // Vérifier les types valides
    const validTypes = ['FACTURE_PROFORMA', 'BON_LIVRAISON', 'FACTURE_TTC'];
    if (!validTypes.includes(sourceType) || !validTypes.includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: 'Types de documents non pris en charge'
      });
    }
    
    // Vérifier les combinaisons valides
    const validTransformations = [
      { source: 'FACTURE_PROFORMA', target: 'BON_LIVRAISON' },
      { source: 'BON_LIVRAISON', target: 'FACTURE_TTC' }
    ];
    
    const isValidTransformation = validTransformations.some(
      t => t.source === sourceType && t.target === targetType
    );
    
    if (!isValidTransformation) {
      return res.status(400).json({
        success: false,
        error: `La transformation de ${sourceType} vers ${targetType} n'est pas prise en charge`
      });
    }
    
    // Récupérer tous les documents sources
    const sourceDocuments = await Vente.find({
      _id: { $in: documentIds },
      typeDocument: sourceType
    }).populate('clientId').populate('articles').populate('transaction');
    
    console.log(`Nombre de documents sources trouvés: ${sourceDocuments.length}`);
    
    if (sourceDocuments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucun document source trouvé'
      });
    }
    
    // Récupérer le client (peut être sous clientId plutôt que client)
    const clientProperty = sourceDocuments[0].client || sourceDocuments[0].clientId;
    
    if (!clientProperty) {
      return res.status(400).json({
        success: false,
        error: 'Client introuvable dans les documents sources'
      });
    }
    
    // Vérifier que tous les documents ont le même client
    const clientIds = new Set(sourceDocuments.map(doc => {
      const client = doc.client || doc.clientId;
      return client ? client._id.toString() : null;
    }));
    
    if (clientIds.size > 1) {
      return res.status(400).json({
        success: false,
        error: 'Les documents doivent concerner le même client'
      });
    }
    
    // Agréger les articles de tous les documents
    const allArticles = [];
    sourceDocuments.forEach(doc => {
      // Utiliser la propriété correcte pour les articles
      const articlesProperty = doc.articles || doc.articlesArray || (doc.transaction && doc.transaction.lignes) || [];
      
      if (articlesProperty && Array.isArray(articlesProperty)) {
        articlesProperty.forEach(article => {
          // Convertir l'article en objet simple si c'est un document mongoose
          const articleObject = article.toObject ? article.toObject() : {...article};
          
          // Déterminer l'ID de l'article
          const articleId = articleObject.articleId || articleObject.article || articleObject._id;
          
          if (!articleId) {
            console.warn('Article sans ID trouvé:', articleObject);
            return; // Sauter cet article
          }
          
          // Vérifier si l'article existe déjà dans allArticles
          const existingArticleIndex = allArticles.findIndex(a => {
            const aId = a.articleId || a.article || a._id;
            return aId && articleId && aId.toString() === articleId.toString();
          });
          
          if (existingArticleIndex >= 0) {
            // Si l'article existe, incrémenter la quantité
            allArticles[existingArticleIndex].quantite += (articleObject.quantite || 1);
          } else {
            // Sinon, ajouter le nouvel article
            allArticles.push(articleObject);
          }
        });
      } else {
        console.warn('Aucun article trouvé pour le document:', doc._id);
      }
    });
    
    console.log(`Nombre total d'articles agrégés: ${allArticles.length}`);
    
    // Calculer les totaux
    let sousTotal = 0;
    let totalTTC = 0;
    let montantTaxes = 0;
    
    allArticles.forEach(article => {
      const prixUnitaire = parseFloat(article.prixUnitaire) || 0;
      const quantite = parseInt(article.quantite) || 0;
      const tauxTVA = parseFloat(article.tauxTVA || article.tva) || 0;
      const remise = parseFloat(article.remise) || 0;
      
      const prixHT = prixUnitaire * quantite * (1 - remise / 100);
      const prixTTC = prixHT * (1 + tauxTVA / 100);
      
      sousTotal += prixHT;
      totalTTC += prixTTC;
    });
    
    montantTaxes = totalTTC - sousTotal;
    
    // Préparer les données pour le document cible
    const transformationData = {
      client: clientProperty,
      articles: allArticles,
      sousTotal,
      tva: montantTaxes,
      totalTTC,
      notes: `Document créé à partir de ${documentIds.length} ${sourceType === 'FACTURE_PROFORMA' ? 'devis' : 'bons de livraison'}`
    };
    
    // Si la transformation est de BL vers facture, inclure les infos de paiement du premier BL
    if (sourceType === 'BON_LIVRAISON' && targetType === 'FACTURE_TTC') {
      transformationData.modePaiement = sourceDocuments[0].modePaiement || 'especes';
      transformationData.paiementDetails = sourceDocuments[0].paiementDetails || {};
      transformationData.echeancier = sourceDocuments[0].echeancier || [];
    }
    
    console.log('Données de transformation générées avec succès');
    
    return res.json({
      success: true,
      data: transformationData
    });
    
  } catch (error) {
    console.error('Erreur lors de la transformation des documents:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la transformation des documents'
    });
  }
};