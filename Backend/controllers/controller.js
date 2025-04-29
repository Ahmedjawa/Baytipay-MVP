// Contrôleurs

// controllers/clientFournisseur.controller.js
const clientFournisseurController = {
  // Récupérer tous les clients et fournisseurs
  getAll: async (req, res) => {
    try {
      const type = req.query.type; // 'client' ou 'fournisseur' ou undefined pour tous
      const query = type ? { type } : {};
      
      const parties = await Partie.find(query).sort({ nom: 1 });
      res.status(200).json(parties);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des données", error: error.message });
    }
  },
  
  // Récupérer un client ou fournisseur par ID
  getById: async (req, res) => {
    try {
      const partie = await Partie.findById(req.params.id).populate('dossiers');
      if (!partie) {
        return res.status(404).json({ message: "Client/Fournisseur non trouvé" });
      }
      res.status(200).json(partie);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des données", error: error.message });
    }
  },
  
  // Créer un nouveau client ou fournisseur
  create: async (req, res) => {
    try {
      const nouveauPartie = new Partie(req.body);
      const partie = await nouveauPartie.save();
      res.status(201).json(partie);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de la création", error: error.message });
    }
  },
  
  // Mettre à jour un client ou fournisseur
  update: async (req, res) => {
    try {
      const partie = await Partie.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!partie) {
        return res.status(404).json({ message: "Client/Fournisseur non trouvé" });
      }
      res.status(200).json(partie);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de la mise à jour", error: error.message });
    }
  },
  
  // Supprimer un client ou fournisseur
  delete: async (req, res) => {
    try {
      const partie = await Partie.findByIdAndDelete(req.params.id);
      if (!partie) {
        return res.status(404).json({ message: "Client/Fournisseur non trouvé" });
      }
      // Supprimer aussi les dossiers associés?
      res.status(200).json({ message: "Client/Fournisseur supprimé avec succès" });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression", error: error.message });
    }
  }
};

// controllers/dossier.controller.js
const dossierController = {
  // Récupérer tous les dossiers
  getAll: async (req, res) => {
    try {
      const { partieId, statut } = req.query;
      const query = {};
      
      if (partieId) query.partieId = partieId;
      if (statut) query.statut = statut;
      
      const dossiers = await Dossier.find(query)
                                    .populate('partieId')
                                    .sort({ dateCreation: -1 });
      res.status(200).json(dossiers);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des dossiers", error: error.message });
    }
  },
  
  // Récupérer un dossier par ID
  getById: async (req, res) => {
    try {
      const dossier = await Dossier.findById(req.params.id)
                                  .populate('partieId')
                                  .populate('transactions');
      if (!dossier) {
        return res.status(404).json({ message: "Dossier non trouvé" });
      }
      res.status(200).json(dossier);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération du dossier", error: error.message });
    }
  },
  
  // Créer un nouveau dossier
  create: async (req, res) => {
    try {
      const nouveauDossier = new Dossier(req.body);
      const dossier = await nouveauDossier.save();
      
      // Mettre à jour la liste des dossiers de la partie concernée
      await Partie.findByIdAndUpdate(
        req.body.partieId,
        { $push: { dossiers: dossier._id } }
      );
      
      res.status(201).json(dossier);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de la création du dossier", error: error.message });
    }
  },
  
  // Mettre à jour un dossier
  update: async (req, res) => {
    try {
      const dossier = await Dossier.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!dossier) {
        return res.status(404).json({ message: "Dossier non trouvé" });
      }
      res.status(200).json(dossier);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de la mise à jour du dossier", error: error.message });
    }
  },
  
  // Supprimer un dossier
  delete: async (req, res) => {
    try {
      const dossier = await Dossier.findById(req.params.id);
      if (!dossier) {
        return res.status(404).json({ message: "Dossier non trouvé" });
      }
      
      // Supprimer le dossier de la liste des dossiers de la partie
      await Partie.findByIdAndUpdate(
        dossier.partieId,
        { $pull: { dossiers: dossier._id } }
      );
      
      // Supprimer les transactions associées
      await Transaction.deleteMany({ dossierId: dossier._id });
      
      // Supprimer le dossier
      await Dossier.findByIdAndDelete(req.params.id);
      
      res.status(200).json({ message: "Dossier supprimé avec succès" });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression du dossier", error: error.message });
    }
  }
};


  

// controllers/caisse.controller.js
const caisseController = {
  // Récupérer toutes les caisses hebdomadaires
  getAll: async (req, res) => {
    try {
      const { annee, semaine } = req.query;
      const query = {};
      
      if (annee) query.annee = parseInt(annee);
      if (semaine) query.semaine = parseInt(semaine);
      
      const caisses = await Caisse.find(query).sort({ annee: -1, semaine: -1 });
      res.status(200).json(caisses);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des caisses", error: error.message });
    }
  },
  
  // Récupérer une caisse par ID
  getById: async (req, res) => {
    try {
      const caisse = await Caisse.findById(req.params.id);
      if (!caisse) {
        return res.status(404).json({ message: "Caisse non trouvée" });
      }
      res.status(200).json(caisse);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération de la caisse", error: error.message });
    }
  },
  
  // Créer une nouvelle caisse hebdomadaire
  create: async (req, res) => {
    try {
      // Calculer le solde final
      let soldeFinale = req.body.soldeInitial || 0;
      
      if (req.body.entrees && req.body.entrees.length > 0) {
        soldeFinale += req.body.entrees.reduce((total, entree) => total + entree.montant, 0);
      }
      
      if (req.body.sorties && req.body.sorties.length > 0) {
        soldeFinale -= req.body.sorties.reduce((total, sortie) => total + sortie.montant, 0);
      }
      
      const nouvelleCaisse = new Caisse({
        ...req.body,
        soldeFinale
      });
      
      const caisse = await nouvelleCaisse.save();
      res.status(201).json(caisse);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de la création de la caisse", error: error.message });
    }
  },
  
  // Mettre à jour une caisse
  update: async (req, res) => {
    try {
      // Recalculer le solde final si nécessaire
      let dataToUpdate = { ...req.body };
      
      if (req.body.entrees || req.body.sorties || req.body.soldeInitial) {
        const caisse = await Caisse.findById(req.params.id);
        let soldeFinale = req.body.soldeInitial || caisse.soldeInitial;
        
        const entrees = req.body.entrees || caisse.entrees;
        const sorties = req.body.sorties || caisse.sorties;
        
        if (entrees.length > 0) {
          soldeFinale += entrees.reduce((total, entree) => total + entree.montant, 0);
        }
        
        if (sorties.length > 0) {
          soldeFinale -= sorties.reduce((total, sortie) => total + sortie.montant, 0);
        }
        
        dataToUpdate.soldeFinale = soldeFinale;
      }
      
      const caisseUpdated = await Caisse.findByIdAndUpdate(
        req.params.id,
        dataToUpdate,
        { new: true, runValidators: true }
      );
      
      if (!caisseUpdated) {
        return res.status(404).json({ message: "Caisse non trouvée" });
      }
      
      res.status(200).json(caisseUpdated);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de la mise à jour de la caisse", error: error.message });
    }
  },
  
  // Ajouter une entrée à la caisse
  addEntree: async (req, res) => {
    try {
      const caisse = await Caisse.findById(req.params.id);
      if (!caisse) {
        return res.status(404).json({ message: "Caisse non trouvée" });
      }
      
      const nouvelleEntree = {
        date: req.body.date || new Date(),
        montant: req.body.montant,
        description: req.body.description,
        reference: req.body.reference
      };
      
      caisse.entrees.push(nouvelleEntree);
      caisse.soldeFinale += nouvelleEntree.montant;
      
      await caisse.save();
      res.status(200).json(caisse);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de l'ajout de l'entrée", error: error.message });
    }
  },
  
  // Ajouter une sortie à la caisse
  addSortie: async (req, res) => {
    try {
      const caisse = await Caisse.findById(req.params.id);
      if (!caisse) {
        return res.status(404).json({ message: "Caisse non trouvée" });
      }
      
      const nouvelleSortie = {
        date: req.body.date || new Date(),
        montant: req.body.montant,
        description: req.body.description,
        reference: req.body.reference
      };
      
      caisse.sorties.push(nouvelleSortie);
      caisse.soldeFinale -= nouvelleSortie.montant;
      
      await caisse.save();
      res.status(200).json(caisse);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de l'ajout de la sortie", error: error.message });
    }
  },
  
  // Supprimer une caisse
  delete: async (req, res) => {
    try {
      const caisse = await Caisse.findByIdAndDelete(req.params.id);
      if (!caisse) {
        return res.status(404).json({ message: "Caisse non trouvée" });
      }
      res.status(200).json({ message: "Caisse supprimée avec succès" });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de la caisse", error: error.message });
    }
  }
};

// AI Service
const aiService = {
  // Service pour l'IA conversationnelle
  chatbot: async (query, language = 'fr') => {
    try {
      // Ici, vous intégrerez une API d'IA comme OpenAI
      // Exemple simplifié
      const response = "Ceci est une réponse simulée de l'IA. Dans une version réelle, ce serait une réponse d'OpenAI ou d'un autre service d'IA.";
      return response;
    } catch (error) {
      throw new Error(`Erreur lors de la requête à l'IA: ${error.message}`);
    }
  },
  
  // Service pour l'OCR et la reconnaissance d'images
  imageRecognition: async (imageData) => {
    try {
      // Ici, vous intégrerez Tesseract.js ou une autre solution d'OCR
      // Exemple simplifié
      const extractedData = {
        type: "chèque",
        montant: 1000,
        date: "2023-03-15",
        beneficiaire: "Nom du bénéficiaire",
        numeroReference: "CH123456"
      };
      return extractedData;
    } catch (error) {
      throw new Error(`Erreur lors de la reconnaissance d'image: ${error.message}`);
    }
  }
};

// controllers/ai.controller.js
const aiController = {
  // Point d'entrée pour le chatbot
  chat: async (req, res) => {
    try {
      const { query, language } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "La requête est requise" });
      }
      
      const response = await aiService.chatbot(query, language);
      res.status(200).json({ response });
    } catch (error) {
      res.status(500).json({ message: "Erreur avec l'IA conversationnelle", error: error.message });
    }
  },
  
  // Point d'entrée pour la reconnaissance d'image
  recognizeImage: async (req, res) => {
    try {
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: "Les données d'image sont requises" });
      }
      
      const extractedData = await aiService.imageRecognition(imageData);
      res.status(200).json(extractedData);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la reconnaissance d'image", error: error.message });
    }
  }
};

// controllers/dashboard.controller.js
const dashboardController = {
  // Récupérer les données pour le tableau de bord
  getData: async (req, res) => {
    try {
      const { dateDebut, dateFin } = req.query;
      
      // Vérifier et formater les dates
      const debut = dateDebut ? new Date(dateDebut) : new Date(new Date().setDate(new Date().getDate() - 30));
      const fin = dateFin ? new Date(dateFin) : new Date();
      
      // Requêtes parallèles pour optimiser les performances
      const [transactionsAPayer, transactionsPayees, transactionsImpayees, clients, fournisseurs, caisses] = await Promise.all([
        // Transactions à payer dans la période
        Transaction.find({
          dateEcheance: { $gte: debut, $lte: fin },
          statut: 'à payer'
        }).populate('dossierId'),
        
        // Transactions payées dans la période
        Transaction.find({
          dateEcheance: { $gte: debut, $lte: fin },
          statut: 'payé'
        }).populate('dossierId'),
        
        // Transactions impayées dans la période
        Transaction.find({
          dateEcheance: { $gte: debut, $lte: fin },
          statut: 'impayé'
        }).populate('dossierId'),
        
        // Nombre de clients
        Partie.countDocuments({ type: 'client' }),
        
        // Nombre de fournisseurs
        Partie.countDocuments({ type: 'fournisseur' }),
        
        // Caisses dans la période
        Caisse.find({
          $or: [
            { dateDebut: { $gte: debut, $lte: fin } },
            { dateFin: { $gte: debut, $lte: fin } }
          ]
        })
      ]);
      
      // Calcul des montants totaux
      const montantAPayer = transactionsAPayer.reduce((total, tx) => total + tx.montant, 0);
      const montantPaye = transactionsPayees.reduce((total, tx) => total + tx.montant, 0);
      const montantImpaye = transactionsImpayees.reduce((total, tx) => total + tx.montant, 0);
      
      // Calcul du solde de caisse
      const soldeCaisse = caisses.reduce((total, caisse) => total + caisse.soldeFinale, 0);
      
      // Préparation des données par jour pour les graphiques
      const dateRange = [];
      const currentDate = new Date(debut);
      
      while (currentDate <= fin) {
        dateRange.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Données pour le graphique de transactions
      const graphiqueTransactions = dateRange.map(date => {
        const day = date.toISOString().split('T')[0];
        
        const aPayerJour = transactionsAPayer.filter(tx => 
          tx.dateEcheance.toISOString().split('T')[0] === day
        ).reduce((total, tx) => total + tx.montant, 0);
        
        const payeJour = transactionsPayees.filter(tx => 
          tx.dateEcheance.toISOString().split('T')[0] === day
        ).reduce((total, tx) => total + tx.montant, 0);
        
        const impayeJour = transactionsImpayees.filter(tx => 
          tx.dateEcheance.toISOString().split('T')[0] === day
        ).reduce((total, tx) => total + tx.montant, 0);
        
        return {
          date: day,
          aPayer: aPayerJour,
          paye: payeJour,
          impaye: impayeJour
        };
      });
      
      // Compilation des données du tableau de bord
      const dashboardData = {
        resume: {
          totalAPayer: montantAPayer,
          totalPaye: montantPaye,
          totalImpaye: montantImpaye,
          soldeCaisse,
          nbClients: clients,
          nbFournisseurs: fournisseurs
        },
        graphiques: {
          transactions: graphiqueTransactions
        },
        prochainesEcheances: transactionsAPayer.slice(0, 5), // 5 prochaines échéances
        dernieresTransactions: [
          ...transactionsPayees, 
          ...transactionsImpayees
        ].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5) // 5 dernières transactions
      };
      
      res.status(200).json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des données du tableau de bord", error: error.message });
    }
  }
};

// controllers/print.controller.js
const printController = {
  // Générer et renvoyer un document imprimable
  generatePrintable: async (req, res) => {
    try {
      const { transactionIds, format } = req.body;
      
      if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ message: "IDs de transactions requis" });
      }
      
      const result = await printService.generatePrintablePDF(transactionIds, format || 'A4');
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la génération du document imprimable", error: error.message });
    }
  }
};
