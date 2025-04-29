const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI); // Supprimez les options inutiles
    console.log('Connecté à MongoDB Atlas');
  } catch (error) {
    console.error('Erreur de connexion à MongoDB :', error);
    process.exit(1);
  }
};

module.exports = connectDB;