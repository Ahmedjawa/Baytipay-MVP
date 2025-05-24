const mongoose = require('mongoose');

const CategorieArticleSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de la catégorie est obligatoire'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  actif: {
    type: Boolean,
    default: true
  },
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour les recherches fréquentes
CategorieArticleSchema.index({ nom: 1, entrepriseId: 1 }, { unique: true });
CategorieArticleSchema.index({ entrepriseId: 1 });

module.exports = mongoose.model('CategorieArticle', CategorieArticleSchema, 'categories_articles'); 