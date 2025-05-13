// Middleware d'authentification - server/middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('Token manquant');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId)
      .select('+password'); // Récupérer le password si nécessaire pour certaines opérations
    
    if (!user) throw new Error('Utilisateur introuvable');
    
    // Assurer que l'utilisateur est actif
    if (!user.isActive) {
      throw new Error('Compte utilisateur désactivé');
    }

    // Mettre à jour lastLogin si nécessaire
    if (!user.lastLogin || (new Date() - user.lastLogin) > 24 * 60 * 60 * 1000) {
      user.lastLogin = new Date();
      await user.save();
    }

    // Ajouter les informations de l'utilisateur à la requête
    req.user = user;
    req.userId = user._id;
    req.entrepriseId = user.entrepriseId;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: error.message || 'Authentification requise' 
    });
  }
};