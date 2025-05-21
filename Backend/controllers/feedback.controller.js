// controllers/feedback.controller.js
const Feedback = require('../models/feedback.model');
const entityExtractor = require('../services/entityExtractor');

/**
 * Controller pour gérer les retours utilisateurs sur les résultats d'OCR
 */
const feedbackController = {
  /**
   * Enregistre un feedback utilisateur pour un document
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async saveFeedback(req, res) {
    try {
      const { documentId, originalText, extractedEntities, correctedEntities, userId } = req.body;
      
      if (!documentId || !originalText || !correctedEntities) {
        return res.status(400).json({
          success: false,
          message: 'Données de feedback incomplètes'
        });
      }
      
      // Créer un nouvel enregistrement de feedback
      const feedback = new Feedback({
        documentId,
        originalText,
        extractedEntities,
        correctedEntities,
        userId
      });
      
      await feedback.save();
      
      // Envoyer les corrections à l'extracteur d'entités pour apprentissage
      await entityExtractor.recordFeedback(originalText, extractedEntities, correctedEntities);
      
      res.status(201).json({
        success: true,
        message: 'Feedback enregistré avec succès',
        feedbackId: feedback._id
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du feedback:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'enregistrement du feedback',
        error: error.message
      });
    }
  },
  
  /**
   * Récupère les feedbacks pour un document spécifique
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async getFeedbackByDocument(req, res) {
    try {
      const { documentId } = req.params;
      
      const feedbacks = await Feedback.find({ documentId }).sort({ createdAt: -1 });
      
      res.json({
        success: true,
        count: feedbacks.length,
        data: feedbacks
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des feedbacks:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des feedbacks',
        error: error.message
      });
    }
  },
  
  /**
   * Récupère les statistiques sur les feedbacks
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  async getFeedbackStats(req, res) {
    try {
      const totalFeedbacks = await Feedback.countDocuments();
      const recentFeedbacks = await Feedback.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      // Calculer le taux de correction (pourcentage de champs corrigés)
      const feedbacks = await Feedback.find({}, { extractedEntities: 1, correctedEntities: 1 });
      
      let totalFields = 0;
      let correctedFields = 0;
      
      feedbacks.forEach(feedback => {
        const extracted = feedback.extractedEntities || {};
        const corrected = feedback.correctedEntities || {};
        
        for (const field in corrected) {
          totalFields++;
          if (!extracted[field] || JSON.stringify(extracted[field]) !== JSON.stringify(corrected[field])) {
            correctedFields++;
          }
        }
      });
      
      const correctionRate = totalFields > 0 ? (correctedFields / totalFields) * 100 : 0;
      
      res.json({
        success: true,
        stats: {
          totalFeedbacks,
          recentFeedbacks,
          correctionRate: correctionRate.toFixed(2)
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      });
    }
  }
};

module.exports = feedbackController;
