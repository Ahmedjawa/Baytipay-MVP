const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password, nom, prenom } = req.body;

    // Vérification de l'existence de l'utilisateur
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Cet email est déjà utilisé' 
      });
    }

    // Création de l'utilisateur - Le hachage sera géré par le middleware pre('save')
    const user = new User({
      email,
      password,  // Pas besoin de hacher ici, c'est géré par le middleware
      nom,
      prenom
    });

    await user.save();

    // Génération du token JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Recherche de l'utilisateur avec le mot de passe (override du select: false)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Validation du mot de passe avec la méthode du modèle
    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }

    // Mise à jour de la date dernière connexion
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Génération du token JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
};