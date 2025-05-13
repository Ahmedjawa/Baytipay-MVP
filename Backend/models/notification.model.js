// models/notification.model.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: [true, 'Le titre de la notification est obligatoire'],
    trim: true,
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  message: {
    type: String,
    required: [true, 'Le message de la notification est obligatoire'],
    trim: true,
    maxlength: [500, 'Le message ne peut pas dépasser 500 caractères']
  },
  type: {
    type: String,
    enum: ['INFO', 'AVERTISSEMENT', 'ERREUR', 'SUCCES'],
    default: 'INFO'
  },
  categorie: {
    type: String,
    enum: ['DEPENSE', 'PAIEMENT', 'ECHEANCE', 'SYSTEME', 'AUTRE'],
    default: 'AUTRE'
  },
  lien: {
    type: String,
    trim: true
  },
  canal: {
    type: String,
    enum: ['APPLICATION', 'EMAIL', 'SMS'],
    default: 'APPLICATION'
  },
  estLu: {
    type: Boolean,
    default: false
  },
  dateLecture: {
    type: Date
  },
  destinataireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entiteId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entiteType'
  },
  entiteType: {
    type: String,
    enum: ['Depense', 'Paiement', 'CompteBancaire', null],
    default: null
  },
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  },
  priorite: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  programmeePour: {
    type: Date
  },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'ENVOYEE', 'ECHEC'],
    default: 'EN_ATTENTE'
  },
  tentativesEnvoi: {
    type: Number,
    default: 0
  },
  derniereErreur: {
    type: String
  }
}, {
  timestamps: true
});

// Indexation pour les performances
NotificationSchema.index({ destinataireId: 1, estLu: 1 });
NotificationSchema.index({ entrepriseId: 1, categorie: 1 });
NotificationSchema.index({ canal: 1, statut: 1 });
NotificationSchema.index({ programmeePour: 1 }, { sparse: true });
NotificationSchema.index({ entiteId: 1, entiteType: 1 }, { sparse: true });

// Méthode pour marquer comme lu
NotificationSchema.methods.marquerCommeLu = function() {
  this.estLu = true;
  this.dateLecture = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', NotificationSchema, 'notifications');