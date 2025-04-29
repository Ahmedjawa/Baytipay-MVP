const connectDB = require('./database');
const Partie = require('./models/partie.model');

const init = async () => {
  await connectDB();

  try {
    // Exemple de création d'une entité
    const partie = new Partie({
      type: 'client',
      nom: 'Exemple Client',
      adresse: '123 Rue Exemple',
      telephone: '0123456789',
      email: 'client@example.com',
    });
    await partie.save();
    console.log('Initialisation réussie.');
    process.exit();
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
};

init();