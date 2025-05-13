// controllers/document.controller.js
const Document = require('../models/document.model');

exports.getDocumentsByEntity = async (req, res) => {
  try {
    const documents = await Document.findByEntity(
      req.params.entityId,
      req.params.entityType.toUpperCase()
    );
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    if (!document) return res.status(404).json({ message: 'Document non trouvé' });
    res.json({ message: 'Document supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};