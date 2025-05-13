// controllers/transaction.controller.js

const Transaction = require('../models/transaction.model');

const transactionController = {
// Récupérer toutes les transactions
getAll: async (req, res) => {
try {
const { statut, dateDebut, dateFin } = req.query;
const query = {};

  if (statut) query.statut = statut;
  if (dateDebut || dateFin) {
    query.dateTransaction = {}; 
    if (dateDebut) query.dateEcheance.$gte = new Date(dateDebut);
    if (dateFin) query.dateEcheance.$lte = new Date(dateFin);
  }

  const transactions = await Transaction.find(query)
    .sort({ dateEcheance: 1 });
  res.status(200).json(transactions);
} catch (error) {
  res.status(500).json({ message: "Erreur lors de la récupération des transactions", error: error.message });
}
},

// Récupérer une transaction par ID
getById: async (req, res) => {
try {
const transaction = await Transaction.findById(req.params.id);
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
const transaction = await Transaction.findByIdAndDelete(req.params.id);
if (!transaction) {
return res.status(404).json({ message: "Transaction non trouvée" });
}
res.status(200).json({ message: "Transaction supprimée avec succès" });
} catch (error) {
res.status(500).json({ message: "Erreur lors de la suppression de la transaction", error: error.message });
}
}
};

module.exports = transactionController;

