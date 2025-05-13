const mongoose = require('mongoose');

const categorieDepenseSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true
  },
  description: { 
    type: String 
  },
  couleur: { 
    type: String 
  },
  parent_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CategorieDepense'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Relation avec les sous-catégories
categorieDepenseSchema.virtual('sous_categories', {
  ref: 'CategorieDepense',
  localField: '_id',
  foreignField: 'parent_id'
});

// Relation avec les dépenses
categorieDepenseSchema.virtual('depenses', {
  ref: 'Depense',
  localField: '_id',
  foreignField: 'categorie_id'
});

module.exports = mongoose.model('CategorieDepense', categorieDepenseSchema);