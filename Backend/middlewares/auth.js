// Middleware d'authentification - server/middlewares/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

module.exports = async (req, res, next) => {
  try {
    console.log('[AUTH] Requête reçue:', {
      url: req.url,
      method: req.method,
      headers: req.headers
    });

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      console.error('[AUTH] Token manquant');
      throw new Error('Token manquant');
    }

    console.log('[AUTH] Token reçu:', token.substring(0, 10) + '...');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[AUTH] Token décodé:', {
        userId: decoded.userId,
        iat: decoded.iat,
        exp: decoded.exp
      });

      const user = await User.findById(decoded.userId)
        .select('+password'); // Récupérer le password si nécessaire pour certaines opérations
      
      if (!user) {
        console.error('[AUTH] Utilisateur introuvable pour userId:', decoded.userId);
        throw new Error('Utilisateur introuvable');
      }

      console.log('[AUTH] Utilisateur trouvé:', {
        id: user._id,
        entrepriseId: user.entrepriseId,
        role: user.role
      });

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
      console.error('[AUTH] Erreur de décodage du token:', {
        error: error.message,
        name: error.name,
        stack: error.stack
      });
    }
  } catch (error) {
    console.error('[AUTH] Erreur:', {
      error: error.message,
      name: error.name,
      stack: error.stack
    });

    res.status(401).json({ 
      success: false,
      message: error.message || 'Authentification requise' 
    });
  }
};