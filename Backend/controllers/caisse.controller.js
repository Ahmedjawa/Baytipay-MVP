// controllers/caisse.controller.js
const Caisse = require('../models/caisse.model');
const MouvementCaisse = require('../models/mouvementCaisse.model');
const Vente = require('../models/vente.model');
const Transaction = require('../models/transaction.model');
const LigneTransaction = require('../models/ligneTransaction.model');
const Article = require('../models/article.model');
const mongoose = require('mongoose');
const { startOfDay, endOfDay, format, parseISO } = require('date-fns');

// Helper function to handle errors
const handleError = (res, error) => {
  console.error('Error in caisse controller:', error);
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({ message: 'Erreur de validation', errors: messages });
  }
  
  return res.status(500).json({ message: error.message || 'Une erreur est survenue' });
};

/**
 * Récupère le statut de la caisse actuelle pour l'utilisateur connecté
 */
exports.getCaisseStatus = async (req, res) => {
  try {
    // Trouver la caisse ouverte pour l'utilisateur actuel
    const caisseActive = await Caisse.findOne({
      utilisateur_id: req.user._id,
      statut: 'OUVERTE'
    });
    
    // Si aucune caisse n'est ouverte, renvoyer un statut fermé
    if (!caisseActive) {
      return res.json({
        isOpen: false,
        soldeInitial: 0,
        soldeCourant: 0,
        ouvertureCaisse: null,
        fermetureCaisse: null
      });
    }
    
    // Calculer le solde courant en ajoutant tous les mouvements
    const mouvements = await MouvementCaisse.find({ caisse_id: caisseActive._id });
    
    // Calculer le solde théorique: initial + encaissements - décaissements
    let soldeCourant = caisseActive.solde_initial;
    
    mouvements.forEach(mouvement => {
      if (mouvement.type === 'ENCAISSEMENT') {
        soldeCourant += mouvement.montant;
      } else if (mouvement.type === 'DECAISSEMENT') {
        soldeCourant -= mouvement.montant;
      } else if (mouvement.type === 'AJUSTEMENT') {
        soldeCourant += mouvement.montant; // peut être positif ou négatif
      }
    });
    
    // Mettre à jour le solde théorique dans la base de données
    caisseActive.solde_theorique = soldeCourant;
    await caisseActive.save();
    
    res.json({
      isOpen: true,
      soldeInitial: caisseActive.solde_initial,
      soldeCourant: soldeCourant,
      ouvertureCaisse: caisseActive.date_ouverture,
      fermetureCaisse: null
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Ouvrir une nouvelle caisse
 */
exports.ouvrirCaisse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Vérifier s'il n'y a pas déjà une caisse ouverte pour cet utilisateur
    const caisseExistante = await Caisse.findOne({
      utilisateur_id: req.user._id,
      statut: 'OUVERTE'
    });
    
    if (caisseExistante) {
      return res.status(400).json({
        message: 'Une caisse est déjà ouverte pour cet utilisateur'
      });
    }
    
    // Créer une nouvelle caisse
    const nouvelleCaisse = new Caisse({
      utilisateur_id: req.user._id,
      date_ouverture: new Date(),
      solde_initial: req.body.soldeInitial || 0,
      solde_theorique: req.body.soldeInitial || 0,
      statut: 'OUVERTE'
    });
    
    await nouvelleCaisse.save({ session });
    
    // Créer un mouvement d'ajustement pour le solde initial
    if (nouvelleCaisse.solde_initial > 0) {
      const mouvementInitial = new MouvementCaisse({
        caisse_id: nouvelleCaisse._id,
        type: 'AJUSTEMENT',
        montant: nouvelleCaisse.solde_initial,
        mode_paiement: 'ESPECES',
        description: 'Solde initial à l\'ouverture',
        utilisateur_id: req.user._id,
        date_mouvement: new Date()
      });
      
      await mouvementInitial.save({ session });
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({
      message: 'Caisse ouverte avec succès',
      caisse: {
        id: nouvelleCaisse._id,
        soldeInitial: nouvelleCaisse.solde_initial,
        soldeCourant: nouvelleCaisse.solde_theorique,
        dateOuverture: nouvelleCaisse.date_ouverture
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    handleError(res, error);
  }
};

/**
 * Fermer la caisse active
 */
exports.fermerCaisse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Récupérer la caisse active
    const caisseActive = await Caisse.findOne({
      utilisateur_id: req.user._id,
      statut: 'OUVERTE'
    });
    
    if (!caisseActive) {
      return res.status(404).json({
        message: 'Aucune caisse ouverte trouvée'
      });
    }
    
    // Mettre à jour la caisse avec les données de fermeture
    caisseActive.date_fermeture = new Date();
    caisseActive.solde_reel = req.body.soldeFinal;
    caisseActive.ecart = req.body.soldeFinal - caisseActive.solde_theorique;
    caisseActive.statut = 'FERMEE';
    
    await caisseActive.save({ session });
    
    // Si l'écart n'est pas égal à zéro, créer un mouvement d'ajustement
    if (caisseActive.ecart !== 0) {
      const mouvementAjustement = new MouvementCaisse({
        caisse_id: caisseActive._id,
        type: 'AJUSTEMENT',
        montant: caisseActive.ecart,
        mode_paiement: 'ESPECES',
        description: `Ajustement de caisse à la fermeture (${req.body.commentaire || 'Aucun commentaire'})`,
        utilisateur_id: req.user._id,
        date_mouvement: new Date(),
        notes: req.body.commentaire
      });
      
      await mouvementAjustement.save({ session });
    }
    
    await session.commitTransaction();
    session.endSession();
    
    res.json({
      message: 'Caisse fermée avec succès',
      caisse: {
        id: caisseActive._id,
        soldeInitial: caisseActive.solde_initial,
        soldeFinal: caisseActive.solde_reel,
        ecart: caisseActive.ecart,
        dateOuverture: caisseActive.date_ouverture,
        dateFermeture: caisseActive.date_fermeture
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    handleError(res, error);
  }
};

/**
 * Enregistre une nouvelle vente en espèces
 */
exports.enregistrerVenteEspeces = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Vérifier si une caisse est ouverte
    const caisseActive = await Caisse.findOne({
      utilisateur_id: req.user._id,
      statut: 'OUVERTE'
    }).session(session);
    
    if (!caisseActive) {
      return res.status(400).json({
        message: 'Aucune caisse ouverte. Veuillez d\'abord ouvrir une caisse.'
      });
    }
    
    // Créer la transaction
    const transaction = new Transaction({
      type: 'VENTE',
      tiersId: req.body.client ? req.body.client._id : null,
      entrepriseId: req.user.entrepriseId,
      creePar: req.user._id,
      dateTransaction: new Date(),
      montantTotalHT: req.body.sousTotal || 0,
      montantTotalTTC: req.body.totalTTC || 0,
      montantTaxes: req.body.tva || 0,
      statut: 'VALIDEE',
      notes: req.body.notes || '',
      numeroTransaction: await Transaction.generateNumeroTransaction('VENTE', req.user.entrepriseId)
    });
    
    await transaction.save({ session });
    
    // Créer les lignes de transaction
    for (const article of req.body.articles) {
      const ligneTransaction = new LigneTransaction({
        transactionId: transaction._id,
        produitId: article.article, // ID de l'article
        designation: article.designation,
        quantite: article.quantite,
        prixUnitaireHT: article.prixUnitaire,
        tauxTVA: article.tva,
        remise: article.remise || 0,
        montantHT: article.totalHT,
        montantTTC: article.totalTTC,
        entrepriseId: req.user.entrepriseId,
        creePar: req.user._id
      });
      
      await ligneTransaction.save({ session });
      
      // Mettre à jour le stock si c'est un produit physique
      const articleObj = await Article.findById(article.article).session(session);
      if (articleObj && articleObj.type === 'PRODUIT') {
        articleObj.stock -= article.quantite;
        await articleObj.save({ session });
      }
    }
    
    // Créer la vente
    const vente = new Vente({
      transactionId: transaction._id,
      clientId: req.body.client ? req.body.client._id : null,
      dateVente: new Date(),
      modePaiement: 'ESPECES',
      remiseGlobale: req.body.remise || 0,
      statut: 'VALIDEE',
      montantPaye: req.body.totalTTC,
      resteAPayer: 0, // Payé intégralement en espèces
      notesInternes: req.body.notes || '',
      entrepriseId: req.user.entrepriseId,
      creePar: req.user._id
    });
    
    await vente.save({ session });
    
    // Créer un mouvement de caisse pour l'encaissement
    const mouvementCaisse = new MouvementCaisse({
      caisse_id: caisseActive._id,
      type: 'ENCAISSEMENT',
      montant: req.body.totalTTC,
      mode_paiement: 'ESPECES',
      reference_externe: transaction.numeroTransaction,
      description: `Vente ${transaction.numeroTransaction}${req.body.client ? ' à ' + req.body.client.nom : ''}`,
      transaction_id: transaction._id,
      utilisateur_id: req.user._id,
      date_mouvement: new Date()
    });
    
    await mouvementCaisse.save({ session });
    
    // Mettre à jour le solde théorique de la caisse
    caisseActive.solde_theorique += req.body.totalTTC;
    await caisseActive.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({
      message: 'Vente enregistrée avec succès',
      vente: {
        id: vente._id,
        transactionId: transaction._id,
        numeroTransaction: transaction.numeroTransaction,
        montantTTC: transaction.montantTotalTTC,
        date: vente.dateVente
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    handleError(res, error);
  }
};

/**
 * Récupérer le journal de caisse (mouvements)
 */
exports.getJournalCaisse = async (req, res) => {
  try {
    const caisseActive = await Caisse.findOne({
      utilisateur_id: req.user._id,
      statut: 'OUVERTE'
    });
    
    if (!caisseActive) {
      return res.status(404).json({
        message: 'Aucune caisse ouverte trouvée'
      });
    }
    
    const mouvements = await MouvementCaisse.find({ caisse_id: caisseActive._id })
      .sort({ date_mouvement: -1 })
      .populate('utilisateur_id', 'nom prenom');
      
    res.json(mouvements);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Récupérer l'historique des caisses
 */
exports.getHistoriqueCaisses = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.query;
    const query = { utilisateur_id: req.user._id };
    
    if (dateDebut || dateFin) {
      query.date_ouverture = {};
      if (dateDebut) query.date_ouverture.$gte = new Date(dateDebut);
      if (dateFin) query.date_ouverture.$lte = new Date(dateFin);
    }
    
    const historique = await Caisse.find(query)
      .sort({ date_ouverture: -1 });
      
    res.json(historique);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Récupérer les transactions d'aujourd'hui
 */
exports.getTransactionsJournee = async (req, res) => {
  try {
    const debut = startOfDay(new Date());
    const fin = endOfDay(new Date());
    
    const transactions = await Transaction.find({
      entrepriseId: req.user.entrepriseId,
      dateTransaction: { $gte: debut, $lte: fin }
    })
    .populate('tiersId', 'nom prenom raisonSociale type')
    .sort({ dateTransaction: -1 });
    
    res.json(transactions);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Générer un rapport de caisse
 */
exports.genererRapportCaisse = async (req, res) => {
  try {
    const caisseId = req.params.caisseId;
    
    // Si pas d'ID spécifique, utiliser la caisse active
    let caisse;
    if (!caisseId) {
      caisse = await Caisse.findOne({
        utilisateur_id: req.user._id,
        statut: 'OUVERTE'
      });
    } else {
      caisse = await Caisse.findById(caisseId);
    }
    
    if (!caisse) {
      return res.status(404).json({
        message: 'Caisse non trouvée'
      });
    }
    
    // Récupérer tous les mouvements de cette caisse
    const mouvements = await MouvementCaisse.find({ caisse_id: caisse._id })
      .sort({ date_mouvement: 1 });
    
    // Calculer les totaux par type et mode de paiement
    const totaux = {
      encaissementsEspeces: 0,
      encaissementsCheques: 0,
      encaissementsCartes: 0,
      encaissementsVirements: 0,
      decaissementsEspeces: 0,
      decaissementsCheques: 0,
      decaissementsCartes: 0,
      decaissementsVirements: 0,
      ajustements: 0
    };
    
    mouvements.forEach(mouvement => {
      if (mouvement.type === 'ENCAISSEMENT') {
        switch (mouvement.mode_paiement) {
          case 'ESPECES':
            totaux.encaissementsEspeces += mouvement.montant;
            break;
          case 'CHEQUE':
            totaux.encaissementsCheques += mouvement.montant;
            break;
          case 'CARTE':
            totaux.encaissementsCartes += mouvement.montant;
            break;
          case 'VIREMENT':
            totaux.encaissementsVirements += mouvement.montant;
            break;
        }
      } else if (mouvement.type === 'DECAISSEMENT') {
        switch (mouvement.mode_paiement) {
          case 'ESPECES':
            totaux.decaissementsEspeces += mouvement.montant;
            break;
          case 'CHEQUE':
            totaux.decaissementsCheques += mouvement.montant;
            break;
          case 'CARTE':
            totaux.decaissementsCartes += mouvement.montant;
            break;
          case 'VIREMENT':
            totaux.decaissementsVirements += mouvement.montant;
            break;
        }
      } else if (mouvement.type === 'AJUSTEMENT') {
        totaux.ajustements += mouvement.montant;
      }
    });
    
    // Construire le rapport
    const rapport = {
      caisse: {
        id: caisse._id,
        dateOuverture: caisse.date_ouverture,
        dateFermeture: caisse.date_fermeture,
        soldeInitial: caisse.solde_initial,
        soldeTheorique: caisse.solde_theorique,
        soldeReel: caisse.solde_reel,
        ecart: caisse.ecart,
        statut: caisse.statut
      },
      totaux,
      mouvements,
      utilisateur: await getUserInfo(caisse.utilisateur_id)
    };
    
    res.json(rapport);
  } catch (error) {
    handleError(res, error);
  }
};

// Helper pour récupérer les infos utilisateur
async function getUserInfo(userId) {
  // À adapter selon votre modèle utilisateur
  const User = mongoose.model('User');
  const user = await User.findById(userId).select('nom prenom email');
  return user;
}

/**
 * Récupérer l'historique des ventes
 */
exports.getHistoriqueVentes = async (req, res) => {
  try {
    const { dateDebut, dateFin, clientId, modePaiement, minAmount, maxAmount } = req.query;
    const query = { entrepriseId: req.user.entrepriseId };
    
    // Filtres de date
    if (dateDebut || dateFin) {
      query.dateVente = {};
      if (dateDebut) query.dateVente.$gte = new Date(dateDebut);
      if (dateFin) query.dateVente.$lte = new Date(dateFin);
    }
    
    // Autres filtres
    if (clientId) query.clientId = clientId;
    if (modePaiement) query.modePaiement = modePaiement;
    
    const ventes = await Vente.find(query)
      .populate('transactionId')
      .populate('clientId', 'nom prenom raisonSociale email telephone')
      .sort({ dateVente: -1 });
    
    // Filtres de montant côté serveur
    let ventesFiltered = ventes;
    if (minAmount) {
      ventesFiltered = ventesFiltered.filter(v => v.transactionId.montantTotalTTC >= parseFloat(minAmount));
    }
    if (maxAmount) {
      ventesFiltered = ventesFiltered.filter(v => v.transactionId.montantTotalTTC <= parseFloat(maxAmount));
    }
    
    res.json(ventesFiltered);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Ajouter un mouvement de caisse (encaissement ou décaissement manuel)
 */
exports.ajouterMouvement = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const caisseActive = await Caisse.findOne({
      utilisateur_id: req.user._id,
      statut: 'OUVERTE'
    });
    
    if (!caisseActive) {
      return res.status(400).json({
        message: 'Aucune caisse ouverte trouvée'
      });
    }
    
    const { type, montant, modePaiement, description, reference } = req.body;
    
    if (!['ENCAISSEMENT', 'DECAISSEMENT'].includes(type)) {
      return res.status(400).json({
        message: 'Type de mouvement invalide'
      });
    }
    
    // Créer le mouvement
    const mouvement = new MouvementCaisse({
      caisse_id: caisseActive._id,
      type,
      montant: parseFloat(montant),
      mode_paiement: modePaiement,
      description,
      reference_externe: reference,
      utilisateur_id: req.user._id,
      date_mouvement: new Date()
    });
    
    await mouvement.save({ session });
    
    // Mettre à jour le solde théorique
    if (type === 'ENCAISSEMENT') {
      caisseActive.solde_theorique += parseFloat(montant);
    } else {
      caisseActive.solde_theorique -= parseFloat(montant);
    }
    
    await caisseActive.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({
      message: 'Mouvement enregistré avec succès',
      mouvement,
      nouvelleSolde: caisseActive.solde_theorique
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    handleError(res, error);
  }
};