// controllers/data.controller.js
const User = require('../models/user.model');
const Entreprise = require('../models/entreprise.model');

exports.getData = async (req, res) => {
  try {
    // Récupérer les informations de l'utilisateur connecté
    const user = await User.findById(req.user.id)
      .select('+password') // Pour les opérations nécessitant le password
      .populate('entreprise');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Préparer les données à renvoyer
    const data = {
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role
      },
      entreprise: user.entreprise
    };

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Erreur getData:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur - ' + error.message
    });
  }
};
