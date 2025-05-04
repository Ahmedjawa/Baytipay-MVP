const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('Token manquant');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) throw new Error('Utilisateur introuvable');

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: error.message || 'Authentification requise' 
    });
  }
};