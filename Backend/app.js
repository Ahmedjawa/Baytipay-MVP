require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { errors } = require('celebrate');
const authRoutes = require('./routes/auth.routes');
const authMiddleware = require('./middlewares/auth');
const settingsController = require('./controllers/settings.controller');
const upload = require('./middlewares/upload');

// Vérification des variables d'environnement
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

// Initialisation de l'application
const app = express();

// Configuration CORS avancée
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'x-access-token'
  ],
  credentials: true,
  maxAge: 86400
};

// Middlewares dans le bon ordre
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Gestion globale des pré-requêtes OPTIONS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging simplifié
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté avec succès'))
  .catch(err => console.error('❌ Erreur MongoDB :', err));

// Import des modèles
require('./models/user.model');
require('./models/article.model');
require('./models/contact.model');
require('./models/document.model');
require('./models/echeance.model');
require('./models/echeancier.model');
require('./models/entreprise.model');
require('./models/facture.model');
require('./models/ligneTransaction.model');
require('./models/paiement.model');
require('./models/remise.model');
require('./models/tiers.model');
require('./models/transaction.model');
require('./models/vente.model');
require('./models/achat.model');
require('./models/caisse.model');
require('./models/notification.model');

// Routes
const userRoutes = require('./routes/user.routes');
const articleRoutes = require('./routes/article.routes');
const tierRoutes = require('./routes/tiers.routes');
const documentRoutes = require('./routes/document.routes');
const echeanceRoutes = require('./routes/echeance.routes');
const echeancierRoutes = require('./routes/echeancier.routes');
const entrepriseRoutes = require('./routes/entreprise.route');
const factureRoutes = require('./routes/facture.routes');
const paiementRoutes = require('./routes/paiement.routes');
const remiseRoutes = require('./routes/remise.routes');
const transactionRoutes = require('./routes/transaction.routes');
const venteRoutes = require('./routes/vente.routes');
const achatRoutes = require('./routes/achat.routes');
const caisseRoutes = require('./routes/caisse.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const dataRoutes = require('./routes/data.routes');
const compteBancaireRoutes = require('./routes/compteBancaire.routes');
const recurrenceRoutes = require('./routes/recurrence.routes');
const notificationRoutes = require('./routes/notification.routes');
const categorieRoutes = require('./routes/categories.routes'); // Correction du nom
const depenseroutes = require('./routes/depense.routes');
// Application des routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/tiers', tierRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/echeances', echeanceRoutes);
app.use('/api/echeanciers', echeancierRoutes);
app.use('/api/entreprises', entrepriseRoutes);
app.use('/api/factures', factureRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/remises', remiseRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/depenses', depenseroutes);
app.use('/api/ventes', venteRoutes);
app.use('/api/achats', achatRoutes);
app.use('/api/caisse', caisseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/comptes', compteBancaireRoutes);
app.use('/api/recurrences', recurrenceRoutes);
app.use('/api/notifications', notificationRoutes); // Ajout du point-virgule
app.use('/api/categories', categorieRoutes); // Utilisation de la variable importée
app.use('/api', dataRoutes);

// Routes API spécifiques
app.get('/api/settings', authMiddleware, settingsController.getSettings);
app.post('/api/settings', authMiddleware, settingsController.updateSettings);
app.post('/api/settings/:id/logo', authMiddleware, upload.single('logo'), settingsController.uploadLogo);

// Middleware de validation des erreurs
app.use(errors());

// Middleware de gestion d'erreurs global
app.use((err, req, res, next) => {
  console.error('[ERROR] Erreur dans la requête :', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    error: err.message,
    stack: err.stack
  });
  
  if (err.name === 'JsonWebTokenError') {
    console.error('[ERROR] Token JWT invalide');
    return res.status(401).json({
      success: false,
      message: 'Token JWT invalide'
    });
  }

  if (err.name === 'TokenExpiredError') {
    console.error('[ERROR] Token JWT expiré');
    return res.status(401).json({
      success: false,
      message: 'Token JWT expiré'
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Routes protégées
app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    isValid: true,
    user: {
      _id: req.user._id,
      entrepriseId: req.user.entrepriseId,
      role: req.user.role,
      nom: req.user.nom,
      prenom: req.user.prenom,
      email: req.user.email,
      avatar: req.user.avatar
    }
  });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`⚙️  Environnement: ${process.env.NODE_ENV || 'development'}`);
});