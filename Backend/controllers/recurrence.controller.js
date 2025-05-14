const Recurrence = require('../models/recurrence.model');

// Créer une règle de récurrence
exports.createRecurrence = async (req, res) => {
  try {
    const recurrence = new Recurrence(req.body);
    await recurrence.save();
    res.status(201).json(recurrence);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Récupérer toutes les récurrences
exports.getAllRecurrences = async (req, res) => {
  try {
    const recurrences = await Recurrence.find();
    res.status(200).json(recurrences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer une récurrence par ID
exports.getRecurrenceById = async (req, res) => {
  try {
    const recurrence = await Recurrence.findById(req.params.id);
    if (!recurrence) return res.status(404).json({ message: 'Récurrence introuvable' });
    res.status(200).json(recurrence);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Modifier une règle de récurrence
exports.updateRecurrence = async (req, res) => {
  try {
    const updated = await Recurrence.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Récurrence introuvable' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Supprimer une règle de récurrence
exports.deleteRecurrence = async (req, res) => {
  try {
    const deleted = await Recurrence.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Récurrence introuvable' });
    res.status(200).json({ message: 'Récurrence supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get by frequency
exports.getRecurrencesByFrequence = async (req, res) => {
  try {
    const recurrences = await Recurrence.find({ frequence: req.params.frequence });
    res.status(200).json(recurrences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get by entreprise
exports.getRecurrencesByEntreprise = async (req, res) => {
  try {
    const recurrences = await Recurrence.find({ entrepriseId: req.params.entrepriseId });
    res.status(200).json(recurrences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get default models
exports.getRecurrencesParDefaut = async (req, res) => {
  try {
    const recurrences = await Recurrence.find({ estModeleParDefaut: true });
    res.status(200).json(recurrences);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Apply to expense (stub implementation)
exports.appliquerRecurrenceADepense = async (req, res) => {
  try {
    // Implement your business logic here
    res.status(200).json({ message: 'Functionality under development' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
