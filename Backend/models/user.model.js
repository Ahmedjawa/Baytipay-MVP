const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    lowercase: true
  },
  password: { type: String, required: true, select: false },
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  entrepriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entreprise',
    required: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'UTILISATEUR', 'COMPTABLE', 'MANAGER'],
    default: 'UTILISATEUR'
  },
  fcmToken: { type: String },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
  avatar: { type: String }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Méthode de vérification de mot de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Configuration supplémentaire pour ne pas renvoyer le password
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    return ret;
  }
});

// Virtuel pour l'entreprise associée
userSchema.virtual('entreprise', {
  ref: 'Entreprise',
  localField: 'entrepriseId',
  foreignField: '_id',
  justOne: true
});

// Index pour améliorer les performances
userSchema.index({ entrepriseId: 1 });

module.exports = mongoose.model('User', userSchema);