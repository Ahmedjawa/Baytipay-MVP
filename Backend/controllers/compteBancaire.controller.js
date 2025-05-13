// controllers/compteBancaire.controller.js
const CompteBancaire = require('../models/compteBancaire.model');
const mongoose = require('mongoose');

/**
 * Création d'un nouveau compte bancaire
 * @route POST /api/comptes
 */
exports.createCompteBancaire = async (req, res) => {
  try {
    // Ajout de l'ID de l'utilisateur actif comme créateur
    req.body.creePar = req.user._id;
    
    // Vérifier s'il s'agit du premier compte de l'entreprise pour le définir comme principal si nécessaire
    const comptesExistants = await CompteBancaire.countDocuments({ 
      entrepriseId: req.body.entrepriseId,
      actif: true
    });
    
    if (comptesExistants === 0) {
      req.body.estPrincipal = true;
    } else if (req.body.estPrincipal) {
      // Si ce compte doit être principal, désactiver l'attribut estPrincipal des autres comptes
      await CompteBancaire.updateMany(
        { entrepriseId: req.body.entrepriseId, estPrincipal: true },
        { estPrincipal: false }
      );
    }
    
    const compteBancaire = new CompteBancaire(req.body);
    const savedCompteBancaire = await compteBancaire.save();
    
    res.status(201).json({
      success: true,
      data: savedCompteBancaire
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error
    });
  }
};

/**
 * Récupération de tous les comptes bancaires
 * @route GET /api/comptes
 */
exports.getAllComptesBancaires = async (req, res) => {
  try {
    const filters = { actif: true };
    
    // Filtrage par entreprise si spécifié
    if (req.query.entrepriseId) {
      filters.entrepriseId = mongoose.Types.ObjectId(req.query.entrepriseId);
    } else {
      filters.entrepriseId = req.user.entrepriseId;
    }
    
    // Filtrage par type si spécifié
    if (req.query.type) {
      filters.type = req.query.type;
    }
    
    const comptesBancaires = await CompteBancaire.find(filters)
      .sort({ estPrincipal: -1, nom: 1 });
      
    res.status(200).json({
      success: true,
      count: comptesBancaires.length,
      data: comptesBancaires
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des comptes bancaires",
      error: error.message
    });
  }
};

/**
 * Récupération d'un compte bancaire par son ID
 * @route GET /api/comptes/:id
 */
exports.getCompteBancaireById = async (req, res) => {
  try {
    const compteBancaire = await CompteBancaire.findById(req.params.id)
      .populate('creePar', 'nom prenom email');
      
    if (!compteBancaire) {
      return res.status(404).json({
        success: false,
        message: "Compte bancaire non trouvé"
      });
    }
    
    // Vérification que l'utilisateur a accès au compte (même entreprise)
    if (compteBancaire.entrepriseId.toString() !== req.user.entrepriseId.toString() && !req.user.estAdmin) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation d'accéder à ce compte bancaire"
      });
    }
    
    res.status(200).json({
      success: true,
      data: compteBancaire
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du compte bancaire",
      error: error.message
    });
  }
};

/**
 * Mise à jour d'un compte bancaire
 * @route PUT /api/comptes/:id
 */
exports.updateCompteBancaire = async (req, res) => {
  try {
    // Vérifier si le compte existe
    const compteBancaire = await CompteBancaire.findById(req.params.id);
    
    if (!compteBancaire) {
      return res.status(404).json({
        success: false,
        message: "Compte bancaire non trouvé"
      });
    }
    
    // Vérification que l'utilisateur a accès au compte (même entreprise)
    if (compteBancaire.entrepriseId.toString() !== req.user.entrepriseId.toString() && !req.user.estAdmin) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation de modifier ce compte bancaire"
      });
    }
    
    // Si ce compte doit devenir principal, désactiver l'attribut estPrincipal des autres comptes
    if (req.body.estPrincipal) {
      await CompteBancaire.updateMany(
        { 
          entrepriseId: compteBancaire.entrepriseId, 
          _id: { $ne: compteBancaire._id },
          estPrincipal: true 
        },
        { estPrincipal: false }
      );
    }
    
    // Mise à jour du compte bancaire
    const updatedCompteBancaire = await CompteBancaire.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedCompteBancaire
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      error: error
    });
  }
};

/**
 * Suppression d'un compte bancaire
 * @route DELETE /api/comptes/:id
 */
exports.deleteCompteBancaire = async (req, res) => {
  try {
    const compteBancaire = await CompteBancaire.findById(req.params.id);
    
    if (!compteBancaire) {
      return res.status(404).json({
        success: false,
        message: "Compte bancaire non trouvé"
      });
    }
    
    // Vérification que l'utilisateur a accès au compte (même entreprise)
    if (compteBancaire.entrepriseId.toString() !== req.user.entrepriseId.toString() && !req.user.estAdmin) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation de supprimer ce compte bancaire"
      });
    }
    
    // Vérifier s'il existe des transactions liées à ce compte
    // Cette vérification nécessite un modèle Transaction qui n'est pas fourni dans les fichiers
    // Mais il est recommandé de l'ajouter pour éviter la suppression d'un compte avec des transactions

    // Désactiver le compte au lieu de le supprimer
    compteBancaire.actif = false;
    await compteBancaire.save();
    
    // Si c'était le compte principal, définir un autre compte comme principal
    if (compteBancaire.estPrincipal) {
      const autreCompte = await CompteBancaire.findOne({
        entrepriseId: compteBancaire.entrepriseId,
        _id: { $ne: compteBancaire._id },
        actif: true
      });
      
      if (autreCompte) {
        autreCompte.estPrincipal = true;
        await autreCompte.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: "Compte bancaire désactivé avec succès"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du compte bancaire",
      error: error.message
    });
  }
};

/**
 * Récupération des comptes bancaires par type
 * @route GET /api/comptes/type/:type
 */
exports.getComptesBancairesByType = async (req, res) => {
  try {
    const comptesBancaires = await CompteBancaire.find({
      type: req.params.type,
      actif: true,
      entrepriseId: req.query.entrepriseId || req.user.entrepriseId
    }).sort({ nom: 1 });
    
    res.status(200).json({
      success: true,
      count: comptesBancaires.length,
      data: comptesBancaires
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des comptes bancaires",
      error: error.message
    });
  }
};

/**
 * Récupération des comptes bancaires par entreprise
 * @route GET /api/comptes/entreprise/:entrepriseId
 */
exports.getComptesBancairesByEntreprise = async (req, res) => {
  try {
    // Vérification de l'autorisation (l'utilisateur doit appartenir à l'entreprise)
    if (req.user.entrepriseId.toString() !== req.params.entrepriseId && !req.user.estAdmin) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation d'accéder aux comptes de cette entreprise"
      });
    }
    
    const comptesBancaires = await CompteBancaire.find({
      entrepriseId: req.params.entrepriseId,
      actif: true
    }).sort({ estPrincipal: -1, nom: 1 });
    
    res.status(200).json({
      success: true,
      count: comptesBancaires.length,
      data: comptesBancaires
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des comptes bancaires",
      error: error.message
    });
  }
};

/**
 * Mise à jour du solde d'un compte bancaire
 * @route PUT /api/comptes/:id/solde
 */
exports.updateSoldeCompteBancaire = async (req, res) => {
  try {
    const compteBancaire = await CompteBancaire.findById(req.params.id);
    
    if (!compteBancaire) {
      return res.status(404).json({
        success: false,
        message: "Compte bancaire non trouvé"
      });
    }
    
    // Vérification que l'utilisateur a accès au compte (même entreprise)
    if (compteBancaire.entrepriseId.toString() !== req.user.entrepriseId.toString() && !req.user.estAdmin) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation de modifier ce compte bancaire"
      });
    }
    
    // Mise à jour du solde
    await compteBancaire.updateSolde(req.body.montant, req.body.type);
    
    res.status(200).json({
      success: true,
      message: "Solde mis à jour avec succès",
      data: {
        id: compteBancaire._id,
        soldeCourant: compteBancaire.soldeCourant
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Erreur lors de la mise à jour du solde",
      error: error.message
    });
  }
};

/**
 * Récupération des transactions d'un compte
 * @route GET /api/comptes/:id/transactions
 */
exports.getCompteBancaireTransactions = async (req, res) => {
  try {
    const compteBancaire = await CompteBancaire.findById(req.params.id);
    
    if (!compteBancaire) {
      return res.status(404).json({
        success: false,
        message: "Compte bancaire non trouvé"
      });
    }
    
    // Vérification que l'utilisateur a accès au compte (même entreprise)
    if (compteBancaire.entrepriseId.toString() !== req.user.entrepriseId.toString() && !req.user.estAdmin) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation d'accéder aux transactions de ce compte"
      });
    }
    
    // Construction des filtres pour la recherche des transactions
    const filters = {
      compteBancaireId: req.params.id
    };
    
    // Ajouter les filtres de date si spécifiés
    if (req.query.dateDebut) {
      filters.date = { $gte: new Date(req.query.dateDebut) };
    }
    
    if (req.query.dateFin) {
      if (!filters.date) filters.date = {};
      filters.date.$lte = new Date(req.query.dateFin);
    }
    
    // Ajouter le filtre de type si spécifié
    if (req.query.type) {
      filters.type = req.query.type;
    }
    
    // Note: ce code suppose l'existence d'un modèle Transaction
    // qui n'est pas inclus dans les fichiers fournis
    // Remplacer par le bon modèle selon votre application
    
    // Simulation d'une réponse - à remplacer par la requête réelle
    res.status(200).json({
      success: true,
      message: "Cette fonctionnalité nécessite l'implémentation du modèle Transaction",
      data: []
    });
    
    /* Code à implémenter avec le bon modèle
    const transactions = await Transaction.find(filters)
      .sort({ date: -1 })
      .populate('categorieId', 'nom type')
      .populate('tiersId', 'nom');
      
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
    */
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des transactions",
      error: error.message
    });
  }
};