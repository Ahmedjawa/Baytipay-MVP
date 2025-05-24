const mongoose = require('mongoose');
const DocumentNumbering = require('../models/documentNumbering.model');

exports.getNextDocumentNumber = async (req, res) => {
  try {
    const { typeDocument } = req.query;
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    // Recherche ou création du compteur pour le type de document et le mois en cours
    let numbering = await DocumentNumbering.findOne({
      typeDocument,
      year,
      month
    });

    if (!numbering) {
      // Si aucun compteur n'existe pour ce mois, en créer un nouveau
      numbering = new DocumentNumbering({
        typeDocument,
        year,
        month,
        sequence: 0
      });
    }

    // Incrémenter la séquence
    numbering.sequence += 1;
    await numbering.save();

    res.json({
      number: numbering.sequence,
      formattedNumber: formatDocumentNumber(typeDocument, numbering.sequence)
    });
  } catch (error) {
    console.error('Erreur lors de la génération du numéro de document:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du numéro de document' });
  }
};

function formatDocumentNumber(typeDocument, number) {
  const documentTypePrefix = {
    'FACTURE_TTC': 'FT',
    'FACTURE_PROFORMA': 'DP',
    'BON_LIVRAISON': 'BL'
  };

  const prefix = documentTypePrefix[typeDocument] || 'XX';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const sequence = number.toString().padStart(5, '0');
  
  return `${prefix}${year}${month}${sequence}`;
} 