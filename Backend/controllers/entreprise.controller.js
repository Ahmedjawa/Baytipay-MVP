// controllers/entreprise.controller.js
const Entreprise = require('../models/entreprise.model');

exports.getAllEntreprises = async (req, res) => {
  try {
    const entreprises = await Entreprise.find().select('nom formeJuridique logoUrl _id');
    res.status(200).json({ 
      success: true,
      entreprises 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des entreprises'
    });
  }
};

// Modifier la méthode existante pour utiliser req.params.id
exports.getEntrepriseById = async (req, res) => {
  try {
    const entreprise = await Entreprise.findById(req.params.id);
    if(!entreprise) {
      return res.status(404).json({ success: false, message: 'Entreprise non trouvée' });
    }
    res.status(200).json({ success: true, entreprise });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message || 'Erreur lors de la récupération'
    });
  }
};

exports.createOrUpdateEntreprise = async (req, res) => {
  try {
    let entreprise = await Entreprise.findById(req.user.entrepriseId);

    if (!entreprise) {
      // Création si n'existe pas
      entreprise = new Entreprise({ 
        ...req.body,
        _id: req.user.entrepriseId // Utiliser l'ID de l'utilisateur
      });
    } else {
      // Mise à jour si existe déjà
      entreprise = Object.assign(entreprise, req.body);
    }

    const savedEntreprise = await entreprise.save();
    res.json(savedEntreprise);

  } catch (error) {
    res.status(400).json({
      message: error.message || 'Erreur de sauvegarde',
      errors: error.errors
    });
  }
};