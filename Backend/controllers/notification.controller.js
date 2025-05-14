const Notification = require('../models/notification.model');

// Créer une notification
exports.createNotification = async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Récupérer toutes les notifications
exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Récupérer une notification par ID
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification introuvable' });
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Marquer comme lue / modifier une notification
exports.updateNotification = async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Notification introuvable' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Supprimer une notification
exports.deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Notification introuvable' });
    res.status(200).json({ message: 'Notification supprimée' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get notifications for the authenticated user
exports.getMesNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ destinataireId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get unread notifications
exports.getNotificationsNonLues = async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      destinataireId: req.user._id,
      statut: { $ne: 'ENVOYEE' } // Adjust based on your "read" logic
    }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark a notification as read
exports.marquerCommeLu = async (req, res) => {
  try {
    const updated = await Notification.findByIdAndUpdate(
      req.params.id,
      { statut: 'ENVOYEE' }, // Update based on your schema's "read" field
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Notification introuvable' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Mark all notifications as read
exports.marquerToutesCommeLues = async (req, res) => {
  try {
    await Notification.updateMany(
      { destinataireId: req.user._id },
      { statut: 'ENVOYEE' } // Update based on your schema
    );
    res.status(200).json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get notifications by category
exports.getNotificationsByCategorie = async (req, res) => {
  try {
    const notifications = await Notification.find({ categorie: req.params.categorie });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get notifications by channel (canal)
exports.getNotificationsByCanal = async (req, res) => {
  try {
    const notifications = await Notification.find({ canal: req.params.canal });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get notifications by status
exports.getNotificationsByStatut = async (req, res) => {
  try {
    const notifications = await Notification.find({ statut: req.params.statut });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get notifications by recipient
exports.getNotificationsByDestinataire = async (req, res) => {
  try {
    const notifications = await Notification.find({ destinataireId: req.params.destinataireId });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get notifications by entity
exports.getNotificationsByEntite = async (req, res) => {
  try {
    const notifications = await Notification.find({
      entiteType: req.params.entiteType,
      entiteId: req.params.entiteId
    });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
