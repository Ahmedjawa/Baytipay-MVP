require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { errors } = require('celebrate');
const authRoutes = require('./routes/auth.routes');
const authMiddleware = require('./middlewares/auth');

// Vérification des variables d'environnement
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

// Initialisation de l'application
const app = express();

// Middlewares
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    body: req.body,
    headers: req.headers,
    query: req.query
  });
  next();
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Inclure tous les domaines frontend
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté avec succès'))
  .catch(err => console.error('❌ Erreur MongoDB :', err));



// Import des modèles
const User =require('./models/user.model');
require('./models/dossier.model');
require('./models/echeance.model');
require('./models/transaction.model');
require('./models/caisse.model');
require('./models/documentOCR.model');
require('./models/notification.model');
require('./models/client.model');
require('./models/fournisseur.model');



// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/clients', require('./routes/client.routes'));
app.use('/api/fournisseur', require('./routes/fournisseur.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/dossiers', require('./routes/dossier.routes'));
app.use('/api/echeances', require('./routes/echeance.routes'));
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/caisse', require('./routes/caisse.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
//app.use('/api/ai', require('./routes/test.routes'));

// Validation des erreurs
app.use(errors());

// Middleware d'erreur
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});




// Route protégée qui nécessite authentification
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    // req.user est déjà rempli par le middleware auth
    res.send({ 
      success: true, 
      user: { 
        id: req.user._id, 
        email: req.user.email, 
        nom: req.user.nom, 
        prenom: req.user.prenom 
      } 
    });
  } catch (error) {
    res.status(500).send({ success: false, message: 'Erreur lors de la récupération du profil' });
  }
});

// Route pour vérifier la validité du token
app.get('/api/verify-token', authMiddleware, (req, res) => {
  res.status(200).send({ valid: true });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});