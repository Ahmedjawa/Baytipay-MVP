// controllers/transaction.controller.js

const Transaction = require('../models/transaction.model');
const Dossier = require('../models/dossier.model');

const transactionController = {
  // Récupérer toutes les transactions
  getAll: async (req, res) => {
    try {
      const { dossierId, statut, dateDebut, dateFin } = req.query;
      const query = {};

      if (dossierId) query.dossierId = dossierId;
      if (statut) query.statut = statut;
      if (dateDebut || dateFin) {
        query.dateEcheance = {};
        if (dateDebut) query.dateEcheance.$gte = new Date(dateDebut);
        if (dateFin) query.dateEcheance.$lte = new Date(dateFin);
      }

      const transactions = await Transaction.find(query)
        .populate('dossierId')
        .sort({ dateEcheance: 1 });
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération des transactions", error: error.message });
    }
  },

  // Récupérer une transaction par ID
  getById: async (req, res) => {
    try {
      const transaction = await Transaction.findById(req.params.id).populate('dossierId');
      if (!transaction) {
        return res.status(404).json({ message: "Transaction non trouvée" });
      }
      res.status(200).json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la récupération de la transaction", error: error.message });
    }
  },

  // Créer une nouvelle transaction
  create: async (req, res) => {
    try {
      const nouvelleTransaction = new Transaction(req.body);
      const transaction = await nouvelleTransaction.save();

      // Mettre à jour la liste des transactions du dossier concerné
      await Dossier.findByIdAndUpdate(
        req.body.dossierId,
        { $push: { transactions: transaction._id } }
      );

      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de la création de la transaction", error: error.message });
    }
  },

  // Mettre à jour une transaction
  update: async (req, res) => {
    try {
      const transaction = await Transaction.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!transaction) {
        return res.status(404).json({ message: "Transaction non trouvée" });
      }
      res.status(200).json(transaction);
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de la mise à jour de la transaction", error: error.message });
    }
  },

  // Supprimer une transaction
  delete: async (req, res) => {
    try {
      const transaction = await Transaction.findById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction non trouvée" });
      }

      // Supprimer la transaction de la liste des transactions du dossier
      await Dossier.findByIdAndUpdate(
        transaction.dossierId,
        { $pull: { transactions: transaction._id } }
      );

      // Supprimer la transaction
      await Transaction.findByIdAndDelete(req.params.id);

      res.status(200).json({ message: "Transaction supprimée avec succès" });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de la suppression de la transaction", error: error.message });
    }
  },

  // Générer échéancier de paiement
  generateEcheancier: async (req, res) => {
    try {
      const { dossierId, montantTotal, nombreEcheances, datePremiereEcheance, intervalle } = req.body;

      const dossierExiste = await Dossier.findById(dossierId);
      if (!dossierExiste) {
        return res.status(404).json({ message: "Dossier non trouvé" });
      }

      const montantParEcheance = montantTotal / nombreEcheances;
      const transactions = [];
      let dateEcheance = new Date(datePremiereEcheance);

      for (let i = 0; i < nombreEcheances; i++) {
        const nouvelleTransaction = new Transaction({
          dossierId,
          type: req.body.type || 'traite',
          montant: montantParEcheance,
          dateEcheance: new Date(dateEcheance),
          statut: 'à payer',
          numeroReference: `ECH-${dossierId.slice(-4)}-${i + 1}`
        });

        const transaction = await nouvelleTransaction.save();
        transactions.push(transaction);

        await Dossier.findByIdAndUpdate(
          dossierId,
          { $push: { transactions: transaction._id } }
        );

        if (intervalle === 'mois') {
          dateEcheance.setMonth(dateEcheance.getMonth() + 1);
        } else if (intervalle === 'semaine') {
          dateEcheance.setDate(dateEcheance.getDate() + 7);
        } else if (intervalle === 'trimestre') {
          dateEcheance.setMonth(dateEcheance.getMonth() + 3);
        }
      }

      await Dossier.findByIdAndUpdate(dossierId, { montantTotal });

      res.status(201).json({
        message: "Échéancier généré avec succès",
        transactions
      });
    } catch (error) {
      res.status(400).json({ message: "Erreur lors de la génération de l'échéancier", error: error.message });
    }
  }
};

module.exports = transactionController;
