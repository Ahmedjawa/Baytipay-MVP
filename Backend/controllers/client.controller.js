// controllers/client.controller.js
const Client = require('../models/client.model');
const mongoose = require('mongoose');

// Création d'un client avec débogage
exports.createClient = async (req, res) => {
  console.log('⏳ Tentative de création d\'un client avec données:', JSON.stringify(req.body));
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Nettoyer les données entrantes
    const clientData = { ...req.body };
    delete clientData._id;
    delete clientData.createdAt;
    delete clientData.updatedAt;
    
    // Vérification préalable pour les champs uniques
    const existingClient = await Client.findOne({
      $or: [
        { email: clientData.email },
        { matriculeFiscal: clientData.matriculeFiscal }
      ]
    }).session(session);

    if (existingClient) {
      // Déterminer le champ en conflit
      let field = '';
      let message = '';
      
      if (existingClient.email === clientData.email) {
        field = 'email';
        message = `L'email '${clientData.email}' existe déjà dans la base de données.`;
      } else if (existingClient.matriculeFiscal === clientData.matriculeFiscal) {
        field = 'matriculeFiscal';
        message = `La matricule fiscale '${clientData.matriculeFiscal}' existe déjà dans la base de données.`;
      }
      
      console.log(`❌ Création échouée - Champ en conflit: ${field}`);
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({ 
        message: message,
        field: field 
      });
    }

    // Création du client
    console.log('⏳ Validation OK, création du client...');
    const client = new Client(clientData);
    const savedClient = await client.save({ session });
    console.log(`✅ Client créé avec succès, ID: ${savedClient._id}`);
    
    await session.commitTransaction();
    res.status(201).json(savedClient);
  } catch (error) {
    console.error('❌ Erreur lors de la création du client:', error);
    await session.abortTransaction();
    handleClientError(error, res);
  } finally {
    session.endSession();
  }
};

// Récupérer tous les clients
exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.status(200).json(clients);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des clients:', error);
    res.status(500).json({ message: "Erreur lors de la récupération des clients" });
  }
};

// Récupérer un client par ID
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });
    res.status(200).json(client);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du client:', error);
    res.status(500).json({ message: "Erreur lors de la récupération du client" });
  }
};

// Mettre à jour un client
exports.updateClient = async (req, res) => {
  console.log(`⏳ Tentative de mise à jour du client ID: ${req.params.id}`);
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Vérifier si le client existe
    const clientExists = await Client.findById(req.params.id).session(session);
    if (!clientExists) {
      console.log(`❌ Client non trouvé avec ID: ${req.params.id}`);
      await session.abortTransaction();
      return res.status(404).json({ message: "Client non trouvé" });
    }
    
    // Vérifier les conflits potentiels
    if (updateData.email || updateData.matriculeFiscal) {
      const conflicts = await Client.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(updateData.email ? [{ email: updateData.email }] : []),
          ...(updateData.matriculeFiscal ? [{ matriculeFiscal: updateData.matriculeFiscal }] : [])
        ]
      }).session(session);
      
      if (conflicts) {
        let field = '';
        let message = '';
        
        if (updateData.email && conflicts.email === updateData.email) {
          field = 'email';
          message = `L'email '${updateData.email}' existe déjà dans la base de données.`;
        } else if (updateData.matriculeFiscal && conflicts.matriculeFiscal === updateData.matriculeFiscal) {
          field = 'matriculeFiscal';
          message = `La matricule fiscale '${updateData.matriculeFiscal}' existe déjà dans la base de données.`;
        }
        
        console.log(`❌ Mise à jour échouée - Champ en conflit: ${field}`);
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({ 
          message: message,
          field: field 
        });
      }
    }

    // Effectuer la mise à jour
    const updatedClient = await Client.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true, session }
    );
    
    console.log(`✅ Client mis à jour avec succès, ID: ${updatedClient._id}`);
    await session.commitTransaction();
    res.status(200).json(updatedClient);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du client:', error);
    await session.abortTransaction();
    handleClientError(error, res);
  } finally {
    session.endSession();
  }
};

// Supprimer un client
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: "Client non trouvé" });
    console.log(`✅ Client supprimé avec succès, ID: ${req.params.id}`);
    res.status(200).json({ message: "Client supprimé avec succès" });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du client:', error);
    res.status(500).json({ message: "Erreur lors de la suppression du client" });
  }
};

// Gestion centralisée des erreurs avec logs détaillés
function handleClientError(error, res) {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    console.error('❌ Erreur de validation:', errors);
    return res.status(400).json({ message: "Erreur de validation", errors });
  }
  
  if (error.code === 11000) {
    const duplicatedField = Object.keys(error.keyPattern)[0];
    const value = error.keyValue[duplicatedField];
    const message = `La valeur '${value}' du champ ${duplicatedField} existe déjà.`;
    console.error(`❌ Erreur de duplication: ${message}`);
    return res.status(400).json({ 
      message: message,
      field: duplicatedField 
    });
  }
  
  console.error('❌ Erreur serveur non gérée:', error);
  res.status(500).json({ 
    message: "Erreur serveur", 
    error: process.env.NODE_ENV === 'development' ? error.toString() : null 
  });
}