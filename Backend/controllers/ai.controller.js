// controllers/ai.controller.js
const { askAI } = require('../services/ai.service');
const User = require('../models/user.model');
const Dossier = require('../models/dossier.model');
const Transaction = require('../models/transaction.model');

module.exports = {
  // Fonction principale pour interroger l'IA
  askAI: async (req, res) => {
    try {
      const { question } = req.body;
      const userId = req.user ? req.user._id : null;
      
      // Journaliser la question pour analyse future (optionnel)
      console.log(`[Chatbot] Question de l'utilisateur ${userId}: "${question}"`);
      
      // Obtenir une réponse de l'IA
      const response = await askAI(question);
      
      // Journaliser la réponse (optionnel)
      console.log(`[Chatbot] Réponse: "${response}"`);
      
      // Retourner la réponse
      res.json({ response });
    } catch (error) {
      console.error("Erreur du chatbot:", error);
      res.status(500).json({ 
        error: "Erreur de l'IA",
        details: error.message 
      });
    }
  },
  
  // Fonction pour obtenir des données spécifiques à l'utilisateur (si authentifié)
  // Cette fonction n'est pas encore exposée via une route, mais pourrait l'être à l'avenir
  getUserContextData: async (req, res) => {
    try {
      const userId = req.user._id;
      
      // Récupérer des informations contextuelles sur l'utilisateur
      const user = await User.findById(userId).select('-password');
      const dossiers = await Dossier.countDocuments({ userId });
      const transactions = await Transaction.countDocuments({ userId });
      
      res.json({
        user: {
          nom: user.nom,
          prenom: user.prenom,
          email: user.email
        },
        stats: {
          dossiers,
          transactions
        }
      });
    } catch (error) {
      res.status(500).json({ 
        error: "Erreur lors de la récupération du contexte utilisateur",
        details: error.message 
      });
    }
  }
};