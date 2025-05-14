// models/categorie.model.js
const mongoose = require('mongoose');

const CategorieSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de la catégorie est obligatoire'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  type: {
    type: String,
    enum: ['DEPENSE', 'REVENU'],
    required: [true, 'Le type de catégorie est obligatoire']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'La description ne peut pas dépasser 200 caractères']
  },
  couleur: {
    type: String,
    default: '#3788d8', // Couleur par défaut
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Format de couleur hexadécimal invalide']
  },
  icone: {
    type: String,
    default: 'category' // Icône Material-UI par défaut
  },
  parent: {
    type: String,
    enum: ['SALAIRE', 'LOYER','AUTRE CHARGE'],
    default: null
  },
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  },
  estSysteme: {
    type: Boolean,
    default: false // True pour les catégories par défaut du système
  },
  actif: {
    type: Boolean,
    default: true
  },
  creePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
CategorieSchema.index({ type: 1, entrepriseId: 1 });
CategorieSchema.index({ parent: 1 });
CategorieSchema.index({ nom: 'text' });

module.exports = mongoose.model('Categorie', CategorieSchema, 'categories');