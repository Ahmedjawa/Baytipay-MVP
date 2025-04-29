
// Importations
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const echeanceRoutes = require('./routes/echeance.routes'); // Importez les routes

// Charger les variables d'environnement
dotenv.config()
// Vérifiez que la variable MONGODB_URI est bien 
console.log("MONGODB_URI dans .env :", process.env.MONGODB_URI);
if (!process.env.MONGODB_URI) {
  console.error("Erreur : La variable MONGODB_URI n'est pas définie !");
  process.exit(1);
}

// Créer l'application Express
const app = express();

// Middleware pour parser les données JSON
app.use(express.json());

// Connexion à MongoDB
const mongoUri = process.env.MONGODB_URI;
//const mongoUri = "mongodb+srv://ahmedjaoua90:FranceParis0101@cluster0.c53lzpz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connecté à MongoDB Atlas"))
  .catch((err) => console.error("Erreur de connexion à MongoDB :", err));
// Route de test
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Choisir un port
const PORT = process.env.PORT || 5000;

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Exemple de route API pour le frontend
app.get('/api/data', (req, res) => {
    const exempleDonnees = [
        { nom: "Élément 1" },
        { nom: "Élément 2" },
        { nom: "Élément 3" },
    ];
    res.json(exempleDonnees); // Renvoie des données au frontend
});

// Autoriser les requêtes du frontend
app.use(cors({
    origin: "http://localhost:3000", // Remplacez par l'URL de votre frontend en production
}));

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Nouveau middleware d'authentification
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Accès refusé');

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(400).send('Token invalide');
  }
};

// Route login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Vérification simplifiée (à remplacer par une vraie DB)
  if (email === 'admin@baytipay.tn' && password === 'secret') {
    const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.send({ token });
  } else {
    res.status(400).send('Identifiants invalides');
  }
});

// Protéger les routes
app.use('/api/echeances', authMiddleware, echeanceRoutes);