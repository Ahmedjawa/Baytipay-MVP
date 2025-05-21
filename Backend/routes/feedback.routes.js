const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');

// Routes pour la gestion des feedbacks utilisateurs
router.post('/save', feedbackController.saveFeedback);
router.get('/document/:documentId', feedbackController.getFeedbackByDocument);
router.get('/stats', feedbackController.getFeedbackStats);

module.exports = router;
