const Fournisseur = require('../models/fournisseur.model');

// Créer un fournisseur
exports.createFournisseur = async (req, res) => {
  try {
    const fournisseur = new Fournisseur(req.body);
    await fournisseur.save();
    res.status(201).json(fournisseur);
  } catch (error) {
    handleFournisseurError(error, res);
  }
};

// Récupérer tous les fournisseurs
exports.getAllFournisseurs = async (req, res) => {
  try {
    const fournisseurs = await Fournisseur.find().sort({ createdAt: -1 });
    res.status(200).json(fournisseurs);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des fournisseurs" });
  }
};

// Récupérer un fournisseur par ID
exports.getFournisseurById = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findById(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: "Fournisseur non trouvé" });
    res.status(200).json(fournisseur);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du fournisseur" });
  }
};

// Mettre à jour un fournisseur
exports.updateFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!fournisseur) return res.status(404).json({ message: "Fournisseur non trouvé" });
    res.status(200).json(fournisseur);
  } catch (error) {
    handleFournisseurError(error, res);
  }
};

// Supprimer un fournisseur
exports.deleteFournisseur = async (req, res) => {
  try {
    const fournisseur = await Fournisseur.findByIdAndDelete(req.params.id);
    if (!fournisseur) return res.status(404).json({ message: "Fournisseur non trouvé" });
    res.status(200).json({ message: "Fournisseur supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression du fournisseur" });
  }
};

// Gestion centralisée des erreurs
function handleFournisseurError(error, res) {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({ message: "Erreur de validation", errors });
  }
  if (error.code === 11000) {
    return res.status(400).json({ 
      message: "Duplication de données",
      field: Object.keys(error.keyPattern)[0]
    });
  }
  res.status(500).json({ 
    message: "Erreur serveur", 
    error: process.env.NODE_ENV === 'development' ? error.stack : null 
  });
}