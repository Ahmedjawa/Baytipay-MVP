// diagnose-db.js
// Ce script examine en détail la structure de votre base de données et identifie les problèmes

const mongoose = require('mongoose');
const Client = require('./models/client.model');
const Counter = require('./models/counter.model');

// Remplacez par votre URI MongoDB
const MONGODB_URI = 'mongodb+srv://admin:admin@cluster0.c53lzpz.mongodb.net/test?retryWrites=true&w=majority'; // Ajustez selon votre configuration

async function diagnoseDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // 1. Vérifier les compteurs
    console.log('\n🔍 ANALYSE DES COMPTEURS:');
    const counters = await Counter.find();
    console.log(`  - Nombre de compteurs: ${counters.length}`);
    counters.forEach(counter => {
      console.log(`  - Compteur '${counter._id}': ${counter.seq}`);
    });

    // 2. Analyser les clients
    console.log('\n🔍 ANALYSE DES CLIENTS:');
    const clientCount = await Client.countDocuments();
    console.log(`  - Nombre total de clients: ${clientCount}`);

    // 3. Rechercher des doublons de clientId
    console.log('\n🔍 RECHERCHE DE DOUBLONS DE CLIENT ID:');
    
    // Récupérer tous les clientIds
    const allClients = await Client.find({}, 'clientId');
    const clientIdCounts = {};
    
    // Compter les occurrences de chaque clientId
    allClients.forEach(client => {
      const id = client.clientId;
      clientIdCounts[id] = (clientIdCounts[id] || 0) + 1;
    });
    
    // Identifier les doublons
    const duplicates = Object.entries(clientIdCounts)
      .filter(([id, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));
    
    if (duplicates.length === 0) {
      console.log('  ✅ Aucun doublon de clientId trouvé');
    } else {
      console.log(`  ❌ PROBLÈME: ${duplicates.length} clientIds en doublons trouvés:`);
      duplicates.forEach(dup => {
        console.log(`    - clientId ${dup.id}: ${dup.count} occurrences`);
      });
    }

    // 4. Vérifier les autres champs uniques (email, matriculeFiscal)
    console.log('\n🔍 RECHERCHE DE DOUBLONS D\'EMAIL:');
    const emails = await Client.aggregate([
      { $group: { _id: "$email", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    if (emails.length === 0) {
      console.log('  ✅ Aucun doublon d\'email trouvé');
    } else {
      console.log(`  ❌ PROBLÈME: ${emails.length} emails en doublons trouvés:`);
      emails.forEach(dup => {
        console.log(`    - Email ${dup._id}: ${dup.count} occurrences`);
      });
    }
    
    console.log('\n🔍 RECHERCHE DE DOUBLONS DE MATRICULE FISCALE:');
    const matricules = await Client.aggregate([
      { $group: { _id: "$matriculeFiscal", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    if (matricules.length === 0) {
      console.log('  ✅ Aucun doublon de matricule fiscale trouvé');
    } else {
      console.log(`  ❌ PROBLÈME: ${matricules.length} matricules fiscales en doublons trouvées:`);
      matricules.forEach(dup => {
        console.log(`    - Matricule ${dup._id}: ${dup.count} occurrences`);
      });
    }

    // 5. Vérifier les contraintes d'index
    console.log('\n🔍 VÉRIFICATION DES INDEX:');
    const clientCollection = mongoose.connection.db.collection('clients');
    const indexes = await clientCollection.indexes();
    console.log('  - Index trouvés:');
    indexes.forEach(index => {
      console.log(`    - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n📊 DIAGNOSTIC TERMINÉ');

  } catch (error) {
    console.error('❌ ERREUR lors du diagnostic:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Déconnecté de MongoDB');
  }
}

// Script de réparation - NE PAS EXÉCUTER SANS AVOIR FAIT UN DIAGNOSTIC D'ABORD
async function repairDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');
    
    // 1. Supprimer tous les compteurs existants
    await Counter.deleteMany({});
    console.log('✅ Anciens compteurs supprimés');
    
    // 2. Trouver le plus grand clientId existant
    const highestClient = await Client.findOne().sort({ clientId: -1 });
    const highestId = highestClient ? Number(highestClient.clientId) : 0;
    
    // 3. Créer un nouveau compteur avec une valeur safe
    const newCounter = new Counter({ _id: 'clientId', seq: highestId + 100 });
    await newCounter.save();
    console.log(`✅ Nouveau compteur créé avec valeur: ${highestId + 100}`);
    
    // 4. Corriger les doublons de clientId (s'il y en a)
    const clientCollection = mongoose.connection.db.collection('clients');
    
    // Obtenir tous les IDs en double
    const duplicatedIds = await Client.aggregate([
      { $group: { _id: "$clientId", count: { $sum: 1 }, docs: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    let startingNewId = (highestId + 101);
    
    // Pour chaque groupe de doublons
    for (const group of duplicatedIds) {
      // Garder le premier document intact, mettre à jour tous les autres
      const docsToUpdate = group.docs.slice(1); // Tous sauf le premier
      
      for (const docId of docsToUpdate) {
        await Client.updateOne(
          { _id: docId },
          { $set: { clientId: startingNewId++ } }
        );
        console.log(`✅ Mis à jour clientId pour document ${docId} avec nouvelle valeur: ${startingNewId-1}`);
      }
    }
    
    // 5. Recréer les index pour s'assurer qu'ils sont corrects
    await clientCollection.dropIndexes();
    console.log('✅ Anciens index supprimés');
    
    await clientCollection.createIndex({ clientId: 1 }, { unique: true });
    await clientCollection.createIndex({ email: 1 }, { unique: true });
    await clientCollection.createIndex({ matriculeFiscal: 1 }, { unique: true });
    console.log('✅ Nouveaux index créés');
    
    console.log('\n🎉 RÉPARATION TERMINÉE');
    
  } catch (error) {
    console.error('❌ ERREUR lors de la réparation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Déconnecté de MongoDB');
  }
}

// Exécuter le diagnostic
diagnoseDatabase();

// Pour exécuter la réparation, décommentez la ligne suivante APRÈS avoir exécuté le diagnostic
 repairDatabase();