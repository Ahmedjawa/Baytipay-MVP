// controllers/tiers.controller.js
const Tiers = require('../models/tiers.model');
const mongoose = require('mongoose');

// ========== CONTRÔLEURS GÉNÉRAUX POUR LES TIERS ==========

// Création d'un tiers avec débogage
exports.createTiers = async (req, res) => {
  console.log('⏳ Tentative de création d\'un tiers avec données:', JSON.stringify(req.body));
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Nettoyer les données entrantes
    const tiersData = { ...req.body };
    delete tiersData._id;
    delete tiersData.createdAt;
    delete tiersData.updatedAt;
	
	if (tiersData.nom === 'Client comptoir') {
      tiersData.matriculeFiscal = '0000000XXX'; // Forcer une valeur valide
    }

    // Vérification préalable pour les champs uniques
    const existingTiers = await Tiers.findOne({
      $or: [
        { email: tiersData.email },
        { matriculeFiscal: tiersData.matriculeFiscal }
      ]
    }).session(session);

    if (existingTiers) {
      // Déterminer le champ en conflit
      let field = '';
      let message = '';
      
      if (existingTiers.email === tiersData.email) {
        field = 'email';
        message = `L'email '${tiersData.email}' existe déjà dans la base de données.`;
      } else if (existingTiers.matriculeFiscal === tiersData.matriculeFiscal) {
        field = 'matriculeFiscal';
        message = `La matricule fiscale '${tiersData.matriculeFiscal}' existe déjà dans la base de données.`;
      }
      
      console.log(`❌ Création échouée - Champ en conflit: ${field}`);
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({ 
        message: message,
        field: field 
      });
    }

    // Création du tiers
    console.log('⏳ Validation OK, création du tiers...');
    const tiers = new Tiers(tiersData);
    const savedTiers = await tiers.save({ session });
    console.log(`✅ Tiers créé avec succès, ID: ${savedTiers._id}`);
    
    await session.commitTransaction();
    res.status(201).json(savedTiers);
  } catch (error) {
    console.error('❌ Erreur lors de la création du tiers:', error);
    await session.abortTransaction();
    handleTiersError(error, res);
  } finally {
    session.endSession();
  }
};

// Récupérer tous les tiers
exports.getAllTiers = async (req, res) => {
  try {
    const tiers = await Tiers.find().sort({ createdAt: -1 });
    res.status(200).json(tiers);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des tiers:', error);
    res.status(500).json({ message: "Erreur lors de la récupération des tiers" });
  }
};

// Récupérer un tiers par ID
exports.getTiersById = async (req, res) => {
  try {
    const tiers = await Tiers.findById(req.params.id);
    if (!tiers) return res.status(404).json({ message: "Tiers non trouvé" });
    res.status(200).json(tiers);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du tiers:', error);
    res.status(500).json({ message: "Erreur lors de la récupération du tiers" });
  }
};

// Récupérer les tiers par type
exports.getTiersByType = async (req, res) => {
  try {
    const type = req.params.type.toUpperCase();
    
    // Validation du type
    if (!['CLIENT', 'FOURNISSEUR', 'AUTRE'].includes(type)) {
      return res.status(400).json({ 
        message: "Type de tiers invalide. Valeurs acceptées: CLIENT, FOURNISSEUR, AUTRE" 
      });
    }
    
    const tiers = await Tiers.find({ type }).sort({ createdAt: -1 });
    res.status(200).json(tiers);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des tiers par type:', error);
    res.status(500).json({ message: "Erreur lors de la récupération des tiers" });
  }
};

// Mettre à jour un tiers
exports.updateTiers = async (req, res) => {
  console.log(`⏳ Tentative de mise à jour du tiers ID: ${req.params.id}`);
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Vérifier si le tiers existe
    const tiersExists = await Tiers.findById(req.params.id).session(session);
    if (!tiersExists) {
      console.log(`❌ Tiers non trouvé avec ID: ${req.params.id}`);
      await session.abortTransaction();
      return res.status(404).json({ message: "Tiers non trouvé" });
    }
    
    // Vérifier les conflits potentiels
    if (updateData.email || updateData.matriculeFiscal) {
      const conflicts = await Tiers.findOne({
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
    const updatedTiers = await Tiers.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true, session }
    );
    
    console.log(`✅ Tiers mis à jour avec succès, ID: ${updatedTiers._id}`);
    await session.commitTransaction();
    res.status(200).json(updatedTiers);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du tiers:', error);
    await session.abortTransaction();
    handleTiersError(error, res);
  } finally {
    session.endSession();
  }
};

// Supprimer un tiers
exports.deleteTiers = async (req, res) => {
  try {
    const tiers = await Tiers.findByIdAndDelete(req.params.id);
    if (!tiers) return res.status(404).json({ message: "Tiers non trouvé" });
    console.log(`✅ Tiers supprimé avec succès, ID: ${req.params.id}`);
    res.status(200).json({ message: "Tiers supprimé avec succès" });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du tiers:', error);
    res.status(500).json({ message: "Erreur lors de la suppression du tiers" });
  }
};

// Recherche un tiers
exports.searchTiers = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) {
      return res.status(400).json({ message: "Le terme de recherche est requis" });
    }

    // Use simpler text search with case-insensitive option
    const results = await Tiers.find({
      $or: [
        { nom: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { matriculeFiscal: { $regex: searchTerm, $options: 'i' } }
      ]
    }).limit(10);

    res.status(200).json(results);
  } catch (error) {
    console.error('❌ Erreur recherche tiers:', {
      errorType: error.name,
      errorMessage: error.message,
      stack: error.stack
    });
    
    // Check if it's a specific MongoDB error
    if (error.name === 'MongoError') {
      console.error('❌ MongoDB Error Details:', {
        code: error.code,
        operationTime: error.operationTime,
        ok: error.ok,
        n: error.n
      });
    }

    // Return more detailed error response
    res.status(500).json({ 
      message: "Erreur lors de la recherche",
      errorType: error.name,
      details: {
        message: error.message,
        code: error.code,
        stack: error.stack
      }
    });
  }
};

// ========== CONTRÔLEURS SPÉCIFIQUES POUR LES CLIENTS ==========

// Récupérer tous les clients
exports.getAllClients = async (req, res) => {
  try {
    const clients = await Tiers.find({ type: 'CLIENT' }).sort({ createdAt: -1 });
    res.status(200).json(clients);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des clients:', error);
    res.status(500).json({ message: "Erreur lors de la récupération des clients" });
  }
};

// Créer un nouveau client
exports.createClient = async (req, res) => {
  console.log('⏳ Tentative de création d\'un client avec données:', JSON.stringify(req.body));
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Nettoyer les données entrantes et forcer le type CLIENT
    const clientData = { 
      ...req.body,
      type: 'CLIENT' // Forcer le type CLIENT
    };
    delete clientData._id;
    delete clientData.createdAt;
    delete clientData.updatedAt;
    
    if (clientData.nom === 'Client comptoir') {
      clientData.matriculeFiscal = '0000000XXX'; // Forcer une valeur valide
    }

    // Vérification préalable pour les champs uniques
    const existingClient = await Tiers.findOne({
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
      
      console.log(`❌ Création client échouée - Champ en conflit: ${field}`);
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({ 
        message: message,
        field: field 
      });
    }

    // Création du client
    console.log('⏳ Validation OK, création du client...');
    const client = new Tiers(clientData);
    const savedClient = await client.save({ session });
    console.log(`✅ Client créé avec succès, ID: ${savedClient._id}`);
    
    await session.commitTransaction();
    res.status(201).json(savedClient);
  } catch (error) {
    console.error('❌ Erreur lors de la création du client:', error);
    await session.abortTransaction();
    handleTiersError(error, res);
  } finally {
    session.endSession();
  }
};

// Récupérer un client par ID
exports.getClientById = async (req, res) => {
  try {
    const client = await Tiers.findOne({ _id: req.params.id, type: 'CLIENT' });
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
    const updateData = { 
      ...req.body,
      type: 'CLIENT' // Maintenir le type CLIENT
    };
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Vérifier si le client existe
    const clientExists = await Tiers.findOne({ 
      _id: req.params.id, 
      type: 'CLIENT' 
    }).session(session);
    
    if (!clientExists) {
      console.log(`❌ Client non trouvé avec ID: ${req.params.id}`);
      await session.abortTransaction();
      return res.status(404).json({ message: "Client non trouvé" });
    }
    
    // Vérifier les conflits potentiels
    if (updateData.email || updateData.matriculeFiscal) {
      const conflicts = await Tiers.findOne({
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
        
        console.log(`❌ Mise à jour client échouée - Champ en conflit: ${field}`);
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({ 
          message: message,
          field: field 
        });
      }
    }

    // Effectuer la mise à jour
    const updatedClient = await Tiers.findByIdAndUpdate(
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
    handleTiersError(error, res);
  } finally {
    session.endSession();
  }
};

// Supprimer un client
exports.deleteClient = async (req, res) => {
  try {
    const client = await Tiers.findOneAndDelete({ 
      _id: req.params.id, 
      type: 'CLIENT' 
    });
    if (!client) return res.status(404).json({ message: "Client non trouvé" });
    console.log(`✅ Client supprimé avec succès, ID: ${req.params.id}`);
    res.status(200).json({ message: "Client supprimé avec succès" });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du client:', error);
    res.status(500).json({ message: "Erreur lors de la suppression du client" });
  }
};

// Rechercher des clients
exports.searchClients = async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) {
      return res.status(400).json({ message: "Le terme de recherche est requis" });
    }

    // Recherche spécifique aux clients
    const results = await Tiers.find({
      type: 'CLIENT',
      $or: [
        { nom: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { matriculeFiscal: { $regex: searchTerm, $options: 'i' } }
      ]
    }).limit(10);

    res.status(200).json(results);
  } catch (error) {
    console.error('❌ Erreur recherche clients:', {
      errorType: error.name,
      errorMessage: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      message: "Erreur lors de la recherche des clients",
      errorType: error.name,
      details: {
        message: error.message,
        code: error.code,
        stack: error.stack
      }
    });
  }
};

// ========== FONCTIONS EXISTANTES ==========

exports.getTiersTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ 
      tiersId: req.params.id,
      entrepriseId: req.user.entrepriseId 
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTiersPaiements = async (req, res) => {
  try {
    const paiements = await Paiement.find({
      entrepriseId: req.user.entrepriseId,
      'transactionId.tiersId': req.params.id // Nouvelle approche de population
    })
    .populate({
      path: 'transactionId',
      select: 'tiersId'
    });

    res.json(paiements);
  } catch (error) {
    console.error('Erreur contrôleur paiements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Gestion centralisée des erreurs avec logs détaillés
function handleTiersError(error, res) {
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