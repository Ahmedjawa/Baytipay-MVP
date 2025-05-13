// models/recurrence.model.js
const mongoose = require('mongoose');

/**
 * Schéma pour gérer les configurations de récurrence des dépenses
 * Ce modèle est utilisé pour définir des motifs de récurrence qui peuvent
 * être appliqués à différentes dépenses
 */
const RecurrenceSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom du modèle de récurrence est obligatoire'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'La description ne peut pas dépasser 200 caractères']
  },
  frequence: {
    type: String,
    enum: ['QUOTIDIENNE', 'HEBDOMADAIRE', 'MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE'],
    required: [true, 'La fréquence est obligatoire']
  },
  // Pour la fréquence hebdomadaire, les jours de la semaine concernés (1-7, où 1 = lundi)
  joursHebdo: {
    type: [Number],
    validate: {
      validator: function(v) {
        return !this.frequence === 'HEBDOMADAIRE' || (v && v.length > 0 && v.every(j => j >= 1 && j <= 7));
      },
      message: 'Au moins un jour de la semaine doit être spécifié pour une récurrence hebdomadaire'
    }
  },
  // Pour la fréquence mensuelle, le jour du mois
  jourMois: {
    type: Number,
    min: 1,
    max: 31,
    validate: {
      validator: function(v) {
        return !this.frequence === 'MENSUELLE' || (v >= 1 && v <= 31);
      },
      message: 'Le jour du mois doit être compris entre 1 et 31'
    }
  },
  // Paramètres de notification
  notifications: {
    delaiPreAvis: {
      type: Number,
      default: 3,
      min: 0,
      max: 30
    },
    canaux: {
      type: [String],
      enum: ['APPLICATION', 'EMAIL', 'SMS'],
      default: ['APPLICATION']
    },
    rappels: {
      type: Boolean,
      default: false
    }
  },
  estModeleParDefaut: {
    type: Boolean,
    default: false
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
  },
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
RecurrenceSchema.index({ entrepriseId: 1 });
RecurrenceSchema.index({ frequence: 1 });
RecurrenceSchema.index({ estModeleParDefaut: 1 });

module.exports = mongoose.model('Recurrence', RecurrenceSchema, 'recurrences');