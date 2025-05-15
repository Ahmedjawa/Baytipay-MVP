// server/controllers/documentController.js
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/document.model');

/**
 * Enregistrer un nouveau document
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.saveDocument = async (req, res) => {
  try {
    const {
      title,
      date,
      amount,
      tax,
      totalAmount,
      vendor,
      category,
      reference,
      details,
      imageData,
      actionType
    } = req.body;

    // Valider les données requises
    if (!title || !date || !imageData) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir au moins un titre, une date et une image'
      });
    }

    // Traiter l'image base64
    const base64Data = imageData.includes('base64,') 
      ? imageData.split('base64,')[1] 
      : imageData;
    
    // Créer un nom de fichier unique
    const fileName = `${uuidv4()}.jpg`;
    const uploadDir = path.join(__dirname, '../uploads/documents');
    const filePath = path.join(uploadDir, fileName);
    
    // S'assurer que le répertoire existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Enregistrer l'image sur le disque
    await writeFileAsync(filePath, Buffer.from(base64Data, 'base64'));
    
    // Créer le document dans la base de données
    const document = new Document({
      title,
      date: new Date(date),
      amount: parseFloat(amount) || 0,
      tax: parseFloat(tax) || 0,
      totalAmount: parseFloat(totalAmount) || 0,
      vendor,
      category,
      reference,
      details,
      filePath: `/uploads/documents/${fileName}`,
      actionType
    });
    
    await document.save();
    
    res.status(201).json({
      success: true,
      message: 'Document enregistré avec succès',
      document: {
        id: document._id,
        title: document.title,
        date: document.date,
        filePath: document.filePath
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement du document',
      error: error.message
    });
  }
};

/**
 * Récupérer tous les documents
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find()
      .sort({ date: -1 })
      .select('title date amount totalAmount vendor category reference filePath');
    
    res.json({
      success: true,
      count: documents.length,
      documents
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des documents',
      error: error.message
    });
  }
};

/**
 * Récupérer un document par son ID
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }
    
    res.json({
      success: true,
      document
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du document',
      error: error.message
    });
  }
};

/**
 * Mettre à jour un document
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.updateDocument = async (req, res) => {
  try {
    const { title, date, amount, tax, totalAmount, vendor, category, reference, details } = req.body;
    
    // Rechercher et mettre à jour le document
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      {
        title,
        date: date ? new Date(date) : undefined,
        amount: parseFloat(amount) || undefined,
        tax: parseFloat(tax) || undefined,
        totalAmount: parseFloat(totalAmount) || undefined,
        vendor,
        category,
        reference,
        details
      },
      { new: true, runValidators: true }
    );
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }
    
    res.json({
      success: true,
      message: 'Document mis à jour avec succès',
      document
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du document',
      error: error.message
    });
  }
};

/**
 * Supprimer un document
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 */
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }
    
    // Supprimer le fichier associé
    if (document.filePath) {
      const fullPath = path.join(__dirname, '..', document.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    // Supprimer le document de la base de données
    await document.remove();
    
    res.json({
      success: true,
      message: 'Document supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du document',
      error: error.message
    });
  }
};