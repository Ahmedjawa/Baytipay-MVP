// controllers/categorie.controller.js
const Categorie = require('../models/categorie.model');
const mongoose = require('mongoose');

/**
 * Création d'une nouvelle catégorie
 * @route POST /api/categories
 */
exports.createCategorie = async (req, res) => {
  try {
    const data = {
      ...req.body,
      creePar: req.user._id,
      entrepriseId: req.user.entrepriseId // Récupération depuis le token
    };

    const categorie = new Categorie(data);
    const savedCategorie = await categorie.save(); // Ajout de cette ligne pour définir savedCategorie
    
    res.status(201).json({
      success: true,
      data: savedCategorie
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
 * Récupération de toutes les catégories
 * @route GET /api/categories
 */
exports.getAllCategories = async (req, res) => {
  try {
    // Récupérer l'entrepriseId depuis le token JWT
    const entrepriseId = req.user.entrepriseId;
    
   const filters = { actif: true };
    
    // Utilisation correcte avec 'new' si nécessaire
    if (req.user?.entrepriseId) {
      filters.entrepriseId = req.user.entrepriseId; // Supprimer la conversion si déjà ObjectId
    }

    const categories = await Categorie.find(filters)
      .sort({ nom: 1 })
      .populate('parent', 'nom');
      
    res.status(200).json({
      success: true,
      data: categories // Envoyer directement le tableau de données
    });
    
  } catch (error) {
    console.error('Erreur getCategories:', error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur - " + error.message
    });
  }
};

/**
 * Récupération d'une catégorie par son ID
 * @route GET /api/categories/:id
 */
exports.getCategorieById = async (req, res) => {
  try {
    const categorie = await Categorie.findById(req.params.id)
      .populate('parent', 'nom')
      .populate('creePar', 'nom prenom email');
      
    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }
    
    res.status(200).json({
      success: true,
      data: categorie
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la catégorie",
      error: error.message
    });
  }
};

/**
 * Mise à jour d'une catégorie
 * @route PUT /api/categories/:id
 */
exports.updateCategorie = async (req, res) => {
  try {
    // Vérifier si la catégorie existe
    const categorie = await Categorie.findById(req.params.id);
    
    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }
    
    // Empêcher la modification des catégories système sauf par un admin
    if (categorie.estSysteme && !req.user.estAdmin) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation de modifier une catégorie système"
      });
    }
    
    // Mise à jour de la catégorie
    const updatedCategorie = await Categorie.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedCategorie
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
 * Suppression d'une catégorie
 * @route DELETE /api/categories/:id
 */
exports.deleteCategorie = async (req, res) => {
  try {
    const categorie = await Categorie.findById(req.params.id);
    
    if (!categorie) {
      return res.status(404).json({
        success: false,
        message: "Catégorie non trouvée"
      });
    }
    
    // Empêcher la suppression des catégories système
    if (categorie.estSysteme) {
      return res.status(403).json({
        success: false,
        message: "Impossible de supprimer une catégorie système"
      });
    }
    
    // Désactiver la catégorie au lieu de la supprimer
    categorie.actif = false;
    await categorie.save();
    
    res.status(200).json({
      success: true,
      message: "Catégorie désactivée avec succès"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la catégorie",
      error: error.message
    });
  }
};

/**
 * Récupération des catégories par type (DEPENSE ou REVENU)
 * @route GET /api/categories/type/:type
 */
exports.getCategoriesByType = async (req, res) => {
  try {
    const categories = await Categorie.find({
      type: req.params.type,
      actif: true,
      entrepriseId: req.query.entrepriseId || req.user.entrepriseId
    }).sort({ nom: 1 });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des catégories",
      error: error.message
    });
  }
};

/**
 * Recherche de catégories par terme
 * @route GET /api/categories/search
 */
exports.searchCategories = async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const filters = {
      $text: { $search: searchQuery },
      actif: true,
      entrepriseId: req.query.entrepriseId || req.user.entrepriseId
    };
    
    // Ajout optionnel du filtre par type
    if (req.query.type) {
      filters.type = req.query.type;
    }
    
    const categories = await Categorie.find(filters)
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
      
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la recherche des catégories",
      error: error.message
    });
  }
};

/**
 * Récupération des catégories par entreprise
 * @route GET /api/categories/entreprise/:entrepriseId
 */
exports.getCategoriesByEntreprise = async (req, res) => {
  try {
    // Vérification de l'autorisation (l'utilisateur doit appartenir à l'entreprise)
    if (req.user.entrepriseId.toString() !== req.params.entrepriseId && !req.user.estAdmin) {
      return res.status(403).json({
        success: false,
        message: "Vous n'avez pas l'autorisation d'accéder aux catégories de cette entreprise"
      });
    }
    
    const categories = await Categorie.find({
      entrepriseId: req.params.entrepriseId,
      actif: true
    }).sort({ type: 1, nom: 1 });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des catégories",
      error: error.message
    });
  }
};