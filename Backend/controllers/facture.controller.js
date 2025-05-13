// controllers/facture.controller.js
const Facture = require('../models/facture.model');
const { genererFacturePDF } = require('./vente.controller'); // Réutiliser la fonction existante
const { envoyerFactureEmail } = require('./vente.controller'); // Réutiliser la fonction existante

exports.getByVente = async (req, res, next) => {
  try {
    const facture = await Facture.findOne({
      venteId: req.params.venteId,
      entrepriseId: req.user.entrepriseId
    });
    
    res.json(facture);
  } catch (error) {
    next(error);
  }
};

exports.genererPDF = async (req, res, next) => {
  try {
    await genererFacturePDF(req, res, next);
  } catch (error) {
    next(error);
  }
};

exports.envoyerEmail = async (req, res, next) => {
  try {
     await envoyerFactureEmail(req, res, next);
  } catch (error) {
    next(error);
  }
};