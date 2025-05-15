// server/models/Document.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schéma Mongoose pour les documents scannés
 */
const DocumentSchema = new Schema({
  // Métadonnées de base
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  documentType: {
    type: String,
    enum: ['facture', 'reçu', 'devis', 'bon_livraison', 'bon_commande', 'document'],
    default: 'document'
  },
  
  reference: {
    type: String,
    trim: true
  },
  
  // Dates importantes
  date: {
    type: Date,
    required: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  dueDate: {
    type: Date
  },
  
  // Informations financières
  amount: {
    type: Number,  // Montant HT
    default: 0
  },
  
  tax: {
    type: Number,  // TVA
    default: 0
  },
  
  totalAmount: {
    type: Number,  // Montant TTC
    default: 0
  },
  
  currency: {
    type: String,
    default: 'EUR',
    trim: true
  },
  
  // Relations
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  vendorId: {
    type: Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  
  vendor: {
    type: String,
    trim: true
  },
  
  category: {
    type: String,
    trim: true
  },
  
  // Fichiers associés
  files: [{
    filename: String,
    path: String,
    originalname: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Texte extrait et résultats OCR
  rawText: {
    type: String
  },
  
  entities: {
    type: Map,
    of: String
  },
  
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  
  // Informations supplémentaires
  details: {
    type: String,
    trim: true
  },
  
  tags: [{
    type: String,
    trim: true
  }],
  
  // États et traitement
  status: {
    type: String,
    enum: ['pending', 'processed', 'validated', 'rejected', 'archived'],
    default: 'pending'
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  relatedTransactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction'
  }
}, {
  timestamps: true
});

// Index pour améliorer les recherches
DocumentSchema.index({ userId: 1, date: -1 });
DocumentSchema.index({ vendorId: 1 });
DocumentSchema.index({ documentType: 1 });
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ 'files.filename': 1 });

/**
 * Méthode pour calculer automatiquement le montant total
 */
DocumentSchema.methods.calculateTotal = function() {
  if (this.amount && this.tax) {
    this.totalAmount = this.amount + this.tax;
  }
  return this.totalAmount;
};

/**
 * Pre-save hook pour mettre à jour les timestamps et calculer le total
 */
DocumentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculer le montant total si non défini
  if (!this.totalAmount && this.amount && this.tax) {
    this.totalAmount = this.amount + this.tax;
  }
  
  next();
});

/**
 * Méthode virtuelle pour obtenir le chemin du fichier principal
 */
DocumentSchema.virtual('mainFilePath').get(function() {
  if (this.files && this.files.length > 0) {
    return this.files[0].path;
  }
  return null;
});

/**
 * Méthode pour vérifier si le document est en retard de paiement (pour les factures)
 */
DocumentSchema.methods.isOverdue = function() {
  if (this.documentType === 'facture' && this.dueDate) {
    return new Date() > this.dueDate;
  }
  return false;
};

module.exports = mongoose.model('Document', DocumentSchema);