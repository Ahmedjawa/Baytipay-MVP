// server/controllers/auth.controller.js
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Contrôleur pour l'authentification des utilisateurs
 */
const authController = {
  /**
   * Login d'un utilisateur
   */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Vérifier que l'email et le mot de passe sont fournis
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email et mot de passe requis'
        });
      }

      // Rechercher l'utilisateur par email
      const user = await User.findOne({ email })
        .select('+password')
        .populate('entreprise');

      // Vérifier que l'utilisateur existe
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Vérifier que l'utilisateur est actif
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Compte désactivé. Veuillez contacter l\'administrateur.'
        });
      }

      // Vérifier le mot de passe
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Email ou mot de passe incorrect'
        });
      }

      // Mise à jour de la dernière connexion
      user.lastLogin = new Date();
      await user.save();

      // Générer un token JWT
      const token = jwt.sign(
        { 
          userId: user._id,
          entrepriseId: user.entrepriseId,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Préparation des données utilisateur (sans le mot de passe)
      const userData = {
        _id: user._id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        entrepriseId: user.entrepriseId,
        avatar: user.avatar
      };

      // Si l'entreprise a été populée
      if (user.entreprise) {
        userData.entreprise = {
          _id: user.entreprise._id,
          nom: user.entreprise.nom,
          formeJuridique: user.entreprise.formeJuridique,
          logoUrl: user.entreprise.logoUrl
        };
      }

      // Envoyer la réponse
      return res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        token,
        user: userData
      });
    } catch (error) {
      console.error('Erreur de login:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la connexion',
        error: error.message
      });
    }
  },

  /**
   * Inscription d'un nouvel utilisateur
   */
  register: async (req, res) => {
    try {
      const { email, password, nom, prenom, entrepriseId, role } = req.body;

      // Vérifier que les champs requis sont fournis
      if (!email || !password || !nom || !prenom || !entrepriseId) {
        return res.status(400).json({
          success: false,
          message: 'Tous les champs sont obligatoires'
        });
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Cet email est déjà utilisé'
        });
      }

      // Créer le nouvel utilisateur
      const newUser = new User({
        email,
        password, // Le middleware pre-save se chargera du hashage
        nom,
        prenom,
        entrepriseId,
        role: role || 'UTILISATEUR' // Rôle par défaut
      });

      // Sauvegarder l'utilisateur
      await newUser.save();

      // Générer un token JWT
      const token = jwt.sign(
        { 
          userId: newUser._id,
          entrepriseId: newUser.entrepriseId,
          role: newUser.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Préparation des données utilisateur (sans le mot de passe)
      const userData = {
        _id: newUser._id,
        email: newUser.email,
        nom: newUser.nom,
        prenom: newUser.prenom,
        role: newUser.role,
        entrepriseId: newUser.entrepriseId
      };

      // Envoyer la réponse
      return res.status(201).json({
        success: true,
        message: 'Inscription réussie',
        token,
        user: userData
      });
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'inscription',
        error: error.message
      });
    }
  },

  /**
   * Vérification de la validité du token
   */
  verifyToken: async (req, res) => {
    try {
      // Le middleware auth.js s'est déjà exécuté, donc si on arrive ici le token est valide
      // et req.user contient les données de l'utilisateur
      
      return res.status(200).json({
        success: true,
        isValid: true,
        user: {
          _id: req.user._id,
          email: req.user.email,
          nom: req.user.nom,
          prenom: req.user.prenom,
          role: req.user.role,
          entrepriseId: req.user.entrepriseId,
          avatar: req.user.avatar
        }
      });
    } catch (error) {
      console.error('Erreur de vérification:', error);
      return res.status(401).json({
        success: false,
        isValid: false,
        message: 'Token invalide'
      });
    }
  },

  /**
   * Récupération du profil de l'utilisateur connecté
   */
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
        .populate('entreprise');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          entrepriseId: user.entrepriseId,
          avatar: user.avatar,
          entreprise: user.entreprise ? {
            _id: user.entreprise._id,
            nom: user.entreprise.nom,
            formeJuridique: user.entreprise.formeJuridique,
            logoUrl: user.entreprise.logoUrl
          } : null
        }
      });
    } catch (error) {
      console.error('Erreur de récupération de profil:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du profil',
        error: error.message
      });
    }
  }
};

module.exports = authController;