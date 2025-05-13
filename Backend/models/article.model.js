// models/article.model.js
const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Le code est obligatoire'],
    trim: true,
    unique: true // Le code doit être unique
  },
  designation: {
    type: String,
    required: [true, 'La désignation est obligatoire'],
    trim: true
  },
  type: {
    type: String,
    enum: ['PRODUIT', 'SERVICE'],
    required: [true, 'Le type d\'article est obligatoire']
  },
  prixVenteHT: {
    type: Number,
    required: [true, 'Le prix de vente HT est obligatoire'],
    min: [0, 'Le prix de vente doit être positif']
  },
  prixAchatHT: {
    type: Number,
    default: 0,
    min: [0, 'Le prix d\'achat doit être positif']
  },
  tauxTaxe: {
    type: Number,
    default: 0,
    min: [0, 'Le taux de taxe doit être positif'],
    max: [100, 'Le taux de taxe ne peut dépasser 100%']
  },
  actif: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    required: [true, 'Le stock est obligatoire'],
    min: [0, 'Le stock ne peut pas être négatif'],
    default: 0
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

// Index pour les recherches fréquentes
ArticleSchema.index({ designation: 1 });
ArticleSchema.index({ type: 1, actif: 1 });

module.exports = mongoose.model('Article', ArticleSchema, 'articles');