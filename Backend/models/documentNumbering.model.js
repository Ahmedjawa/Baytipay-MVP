const mongoose = require('mongoose');

const documentNumberingSchema = new mongoose.Schema({
  typeDocument: {
    type: String,
    required: true,
    enum: ['FACTURE_TTC', 'FACTURE_PROFORMA', 'BON_LIVRAISON']
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  sequence: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

// Index composé pour s'assurer qu'il n'y a qu'un seul compteur par type de document et par mois
documentNumberingSchema.index({ typeDocument: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('DocumentNumbering', documentNumberingSchema); 