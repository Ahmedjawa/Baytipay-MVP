// controllers/depense.controller.js
const Depense = require('../models/depense.model');
const Tiers = require('../models/tiers.model');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const ExcelJS = require('exceljs');

// Fonction utilitaire pour générer les occurrences récurrentes
const genererOccurrencesRecurrentes = async (depenseParent) => {
  try {
    if (!depenseParent.estRecurrente || !depenseParent.periodicite) {
      return [];
    }

    const { frequence, dateDebut, dateFin, nombreOccurrences } = depenseParent.periodicite;
    const occurrencesIDs = [];
    
    // Déterminer la date de fin en fonction des paramètres
    let dateFinalOccurrence;
    if (dateFin) {
      dateFinalOccurrence = new Date(dateFin);
    } else if (nombreOccurrences > 0) {
      // Calculer la date de fin en fonction du nombre d'occurrences
      dateFinalOccurrence = new Date(dateDebut);
      
      switch (frequence) {
        case 'QUOTIDIENNE':
          dateFinalOccurrence.setDate(dateFinalOccurrence.getDate() + nombreOccurrences - 1);
          break;
        case 'HEBDOMADAIRE':
          dateFinalOccurrence.setDate(dateFinalOccurrence.getDate() + (nombreOccurrences - 1) * 7);
          break;
        case 'MENSUELLE':
          dateFinalOccurrence.setMonth(dateFinalOccurrence.getMonth() + nombreOccurrences - 1);
          break;
        case 'TRIMESTRIELLE':
          dateFinalOccurrence.setMonth(dateFinalOccurrence.getMonth() + (nombreOccurrences - 1) * 3);
          break;
        case 'SEMESTRIELLE':
          dateFinalOccurrence.setMonth(dateFinalOccurrence.getMonth() + (nombreOccurrences - 1) * 6);
          break;
        case 'ANNUELLE':
          dateFinalOccurrence.setFullYear(dateFinalOccurrence.getFullYear() + nombreOccurrences - 1);
          break;
        default:
          throw new Error('Fréquence invalide');
      }
    } else {
      return []; // Ni date de fin ni nombre d'occurrences défini
    }

    // Générer les occurrences
    let dateActuelle = new Date(dateDebut);
    
    // Incrémenter pour commencer à la deuxième occurrence
    // car la première est la dépense parent elle-même
    switch (frequence) {
      case 'QUOTIDIENNE':
        dateActuelle.setDate(dateActuelle.getDate() + 1);
        break;
      case 'HEBDOMADAIRE':
        dateActuelle.setDate(dateActuelle.getDate() + 7);
        break;
      case 'MENSUELLE':
        dateActuelle.setMonth(dateActuelle.getMonth() + 1);
        break;
      case 'TRIMESTRIELLE':
        dateActuelle.setMonth(dateActuelle.getMonth() + 3);
        break;
      case 'SEMESTRIELLE':
        dateActuelle.setMonth(dateActuelle.getMonth() + 6);
        break;
      case 'ANNUELLE':
        dateActuelle.setFullYear(dateActuelle.getFullYear() + 1);
        break;
    }
    
    let compteur = 0;
    const maxOccurrences = nombreOccurrences > 0 ? nombreOccurrences - 1 : 100; // Limiter à 100 occurrences max si basé sur date de fin

    // Boucle pour créer les occurrences
    while (dateActuelle <= dateFinalOccurrence && compteur < maxOccurrences) {
      // Créer une nouvelle dépense basée sur le parent
      const nouvelleOccurrence = new Depense({
        categorie: depenseParent.categorie,
        montant: depenseParent.montant,
        dateDepense: new Date(dateActuelle),
        beneficiaire: depenseParent.beneficiaire,
        description: depenseParent.description,
        estRecurrente: false, // Les occurrences ne sont pas récurrentes elles-mêmes
        paiement: {
          statut: 'A_PAYER',
          modePaiement: depenseParent.paiement.modePaiement,
          banque: depenseParent.paiement.banque,
          reference: ''
        },
        occurrenceParent: depenseParent._id,
        entrepriseId: depenseParent.entrepriseId,
        creePar: depenseParent.creePar,
        statut: 'ACTIVE',
        notes: `Occurrence générée depuis la dépense récurrente du ${new Date(depenseParent.dateDepense).toLocaleDateString()}`
      });

      // Sauvegarder la nouvelle occurrence
      const savedOccurrence = await nouvelleOccurrence.save();
      occurrencesIDs.push(savedOccurrence._id);

      // Incrémenter la date pour la prochaine occurrence
      switch (frequence) {
        case 'QUOTIDIENNE':
          dateActuelle.setDate(dateActuelle.getDate() + 1);
          break;
        case 'HEBDOMADAIRE':
          dateActuelle.setDate(dateActuelle.getDate() + 7);
          break;
        case 'MENSUELLE':
          dateActuelle.setMonth(dateActuelle.getMonth() + 1);
          break;
        case 'TRIMESTRIELLE':
          dateActuelle.setMonth(dateActuelle.getMonth() + 3);
          break;
        case 'SEMESTRIELLE':
          dateActuelle.setMonth(dateActuelle.getMonth() + 6);
          break;
        case 'ANNUELLE':
          dateActuelle.setFullYear(dateActuelle.getFullYear() + 1);
          break;
      }
      
      compteur++;
    }

    return occurrencesIDs;
  } catch (error) {
    console.error('Erreur lors de la génération des occurrences récurrentes:', error);
    throw error;
  }
};

// Créer une nouvelle dépense
exports.createDepense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { estRecurrente, periodicite, ...depenseData } = req.body;
    
    // Créer la dépense principale
    const newDepense = new Depense({
      ...depenseData,
      estRecurrente,
      periodicite: estRecurrente ? periodicite : undefined
    });

    // Sauvegarder la dépense principale
    const savedDepense = await newDepense.save({ session });
    
    // Générer les occurrences récurrentes si nécessaire
    if (estRecurrente) {
      const occurrencesIDs = await genererOccurrencesRecurrentes(savedDepense);
      
      // Mettre à jour la référence aux occurrences générées
      await Depense.findByIdAndUpdate(
        savedDepense._id, 
        { occurrencesGenerees: occurrencesIDs }, 
        { session }
      );
    }

    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      data: savedDepense,
      message: 'Dépense créée avec succès'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Erreur lors de la création de la dépense:', error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la création de la dépense',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    session.endSession();
  }
};

// Récupérer toutes les dépenses avec filtres
exports.getDepenses = async (req, res) => {
  try {
    const {
      dateDebut,
      dateFin,
      categorie,
      beneficiaire,
      statut,
      statutPaiement,
      montantMin,
      montantMax,
      estRecurrente,
      page = 1,
      limit = 10,
      sort = '-dateDepense'
    } = req.query;

    // Construire les filtres
    const filter = { entrepriseId: req.user.entrepriseId };
    
    if (dateDebut && dateFin) {
      filter.dateDepense = {
        $gte: new Date(dateDebut),
        $lte: new Date(dateFin)
      };
    } else if (dateDebut) {
      filter.dateDepense = { $gte: new Date(dateDebut) };
    } else if (dateFin) {
      filter.dateDepense = { $lte: new Date(dateFin) };
    }
    
    if (categorie) filter.categorie = categorie;
    if (beneficiaire) filter.beneficiaire = beneficiaire;
    if (statut) filter.statut = statut;
    if (statutPaiement) filter['paiement.statut'] = statutPaiement;
    if (estRecurrente !== undefined) filter.estRecurrente = estRecurrente === 'true';
    
    if (montantMin || montantMax) {
      filter.montant = {};
      if (montantMin) filter.montant.$gte = parseFloat(montantMin);
      if (montantMax) filter.montant.$lte = parseFloat(montantMax);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = {};
    const [sortField, sortDirection] = sort.startsWith('-') 
      ? [sort.substring(1), -1] 
      : [sort, 1];
    sortOrder[sortField] = sortDirection;

    // Exécuter la requête avec population des références
    const depenses = await Depense.find(filter)
      .populate('categorie', 'nom couleur icone')
      .populate('beneficiaire', 'nom type matriculeFiscal')
      .sort(sortOrder)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Compter le nombre total de résultats pour la pagination
    const total = await Depense.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: depenses.length,
      data: depenses,
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des dépenses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Récupérer une dépense spécifique par ID
exports.getDepenseById = async (req, res) => {
  try {
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    })
    .populate('categorie', 'nom couleur icone')
    .populate('beneficiaire', 'nom type matriculeFiscal')
    .populate('occurrenceParent')
    .populate('occurrencesGenerees');
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }
    
    res.status(200).json({
      success: true,
      data: depense
    });
  } catch (error) {
    console.error(`Erreur lors de la récupération de la dépense ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la dépense',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mettre à jour une dépense
exports.updateDepense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Vérifier que la dépense existe et appartient à l'entreprise de l'utilisateur
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }
    
    // Option pour propager les modifications aux occurrences futures
    const { propagerModifications, ...updateData } = req.body;
    
    // Mettre à jour la dépense principale
    const updatedDepense = await Depense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true, session }
    );
    
    // Si c'est une dépense récurrente et qu'il faut propager les modifications
    if (depense.estRecurrente && propagerModifications && depense.occurrencesGenerees.length > 0) {
      // Filtrer les champs à propager
      const { montant, categorie, beneficiaire, description, paiement } = updateData;
      
      // Champs sélectionnés pour la propagation
      const fieldsToPropagate = {};
      if (montant !== undefined) fieldsToPropagate.montant = montant;
      if (categorie !== undefined) fieldsToPropagate.categorie = categorie;
      if (beneficiaire !== undefined) fieldsToPropagate.beneficiaire = beneficiaire;
      if (description !== undefined) fieldsToPropagate.description = description;
      
      // Propager uniquement le mode de paiement, pas le statut
      if (paiement && paiement.modePaiement) {
        fieldsToPropagate['paiement.modePaiement'] = paiement.modePaiement;
        if (paiement.banque) fieldsToPropagate['paiement.banque'] = paiement.banque;
      }
      
      // Mettre à jour toutes les occurrences futures (date > aujourd'hui)
      const today = new Date();
      await Depense.updateMany(
        {
          occurrenceParent: depense._id,
          dateDepense: { $gt: today },
          entrepriseId: req.user.entrepriseId
        },
        { $set: fieldsToPropagate },
        { session }
      );
    }
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      data: updatedDepense,
      message: 'Dépense mise à jour avec succès'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(`Erreur lors de la mise à jour de la dépense ${req.params.id}:`, error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour de la dépense',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    session.endSession();
  }
};

// Supprimer une dépense
exports.deleteDepense = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Vérifier que la dépense existe et appartient à l'entreprise de l'utilisateur
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }
    
    // Option pour supprimer les occurrences futures
    const { supprimerOccurrences } = req.query;
    
    // Si c'est une dépense récurrente et qu'il faut supprimer les occurrences
    if (depense.estRecurrente && supprimerOccurrences === 'true' && depense.occurrencesGenerees.length > 0) {
      await Depense.deleteMany(
        { 
          _id: { $in: depense.occurrencesGenerees },
          entrepriseId: req.user.entrepriseId
        },
        { session }
      );
    }
    
    // Supprimer la dépense principale
    await Depense.findByIdAndDelete(req.params.id, { session });
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      message: 'Dépense supprimée avec succès'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(`Erreur lors de la suppression de la dépense ${req.params.id}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la dépense',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// Mettre à jour le statut de paiement
exports.updatePaiementStatus = async (req, res) => {
  try {
    const { statut, datePaiement, reference, banque } = req.body;
    
    // Vérifier que la dépense existe et appartient à l'entreprise de l'utilisateur
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }
    
    // Mettre à jour le statut de paiement
    const updateData = {
      'paiement.statut': statut
    };
    
    if (datePaiement) updateData['paiement.datePaiement'] = new Date(datePaiement);
    if (reference) updateData['paiement.reference'] = reference;
    if (banque) updateData['paiement.banque'] = banque;
    
    const updatedDepense = await Depense.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedDepense,
      message: 'Statut de paiement mis à jour avec succès'
    });
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du statut de paiement pour la dépense ${req.params.id}:`, error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour du statut de paiement',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Ajouter un justificatif à une dépense
exports.addJustificatif = async (req, res) => {
  try {
    // Vérifier que la dépense existe et appartient à l'entreprise de l'utilisateur
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }
    
    // Vérifier qu'un fichier a été envoyé
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }
    
    // Configurer le chemin de stockage
    const uploadDir = path.join(__dirname, '../uploads/justificatifs');
    
    // S'assurer que le répertoire existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Générer un nom de fichier unique
    const fileExt = path.extname(req.file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Écrire le fichier sur le disque
    fs.writeFileSync(filePath, req.file.buffer);
    
    // Créer l'objet justificatif
    const justificatif = {
      nom: req.file.originalname,
      chemin: `/uploads/justificatifs/${fileName}`,
      type: req.file.mimetype,
      taille: req.file.size,
      dateAjout: new Date()
    };
    
    // Ajouter le justificatif à la dépense
    const updatedDepense = await Depense.findByIdAndUpdate(
      req.params.id,
      { $push: { justificatifs: justificatif } },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedDepense,
      message: 'Justificatif ajouté avec succès'
    });
  } catch (error) {
    console.error(`Erreur lors de l'ajout du justificatif pour la dépense ${req.params.id}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du justificatif',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Supprimer un justificatif d'une dépense
exports.deleteJustificatif = async (req, res) => {
  try {
    // Vérifier que la dépense existe et appartient à l'entreprise de l'utilisateur
    const depense = await Depense.findOne({
      _id: req.params.depenseId,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }
    
    // Trouver le justificatif
    const justificatif = depense.justificatifs.id(req.params.justificatifId);
    
    if (!justificatif) {
      return res.status(404).json({
        success: false,
        message: 'Justificatif non trouvé'
      });
    }
    
    // Supprimer le fichier physique
    try {
      const filePath = path.join(__dirname, '..', justificatif.chemin);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      console.error('Erreur lors de la suppression du fichier:', fileError);
      // Continuer même si la suppression du fichier échoue
    }
    
    // Supprimer le justificatif de la dépense
    await Depense.findByIdAndUpdate(
      req.params.depenseId,
      { $pull: { justificatifs: { _id: req.params.justificatifId } } }
    );
    
    res.status(200).json({
      success: true,
      message: 'Justificatif supprimé avec succès'
    });
  } catch (error) {
    console.error(`Erreur lors de la suppression du justificatif ${req.params.justificatifId}:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du justificatif',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Récupérer le résumé des dépenses (pour tableaux de bord) - suite
exports.getDepensesResume = async (req, res) => {
  try {
    const { 
      periode = 'MENSUELLE', 
      dateDebut, 
      dateFin, 
      groupement = 'categorie' 
    } = req.query;
    
    // Définir la période d'analyse
    const today = new Date();
    let debut, fin;
    
    if (dateDebut && dateFin) {
      debut = new Date(dateDebut);
      fin = new Date(dateFin);
    } else {
      // Périodes prédéfinies
      switch (periode) {
        case 'HEBDOMADAIRE':
          debut = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
          fin = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
          break;
        case 'MENSUELLE':
          debut = new Date(today.getFullYear(), today.getMonth(), 1);
          fin = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        case 'TRIMESTRIELLE':
          const trimestre = Math.floor(today.getMonth() / 3);
          debut = new Date(today.getFullYear(), trimestre * 3, 1);
          fin = new Date(today.getFullYear(), (trimestre + 1) * 3, 0);
          break;
        case 'ANNUELLE':
          debut = new Date(today.getFullYear(), 0, 1);
          fin = new Date(today.getFullYear(), 11, 31);
          break;
        default:
          debut = new Date(today.getFullYear(), today.getMonth(), 1);
          fin = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }
    }
    
    // Exécuter l'agrégation
    const resume = await Depense.aggregate([
      {
        $match: {
          entrepriseId: mongoose.Types.ObjectId(req.user.entrepriseId),
          dateDepense: { $gte: debut, $lte: fin },
          statut: 'ACTIVE'
        }
      },
      {
        $group: groupBy
      },
      ...lookupStage
    ]);

    // Calculer les totaux généraux
    const totaux = await Depense.aggregate([
      {
        $match: {
          entrepriseId: mongoose.Types.ObjectId(req.user.entrepriseId),
          dateDepense: { $gte: debut, $lte: fin },
          statut: 'ACTIVE'
        }
      },
      {
        $group: {
          _id: null,
          totalGeneral: { $sum: '$montant' },
          nombreTotal: { $sum: 1 },
          moyenneGenerale: { $avg: '$montant' },
          minGeneral: { $min: '$montant' },
          maxGeneral: { $max: '$montant' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        resume,
        totaux: totaux.length > 0 ? totaux[0] : { totalGeneral: 0, nombreTotal: 0 },
        periode: {
          type: periode,
          debut: debut.toISOString(),
          fin: fin.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé des dépenses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du résumé des dépenses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Exporter les dépenses en CSV
exports.exportDepensesCSV = async (req, res) => {
  try {
    const {
      dateDebut,
      dateFin,
      categorie,
      beneficiaire,
      statut,
      statutPaiement,
      inclureJustificatifs = false
    } = req.query;

    // Construire les filtres
    const filter = { entrepriseId: req.user.entrepriseId };
    
    if (dateDebut && dateFin) {
      filter.dateDepense = {
        $gte: new Date(dateDebut),
        $lte: new Date(dateFin)
      };
    } else if (dateDebut) {
      filter.dateDepense = { $gte: new Date(dateDebut) };
    } else if (dateFin) {
      filter.dateDepense = { $lte: new Date(dateFin) };
    }
    
    if (categorie) filter.categorie = categorie;
    if (beneficiaire) filter.beneficiaire = beneficiaire;
    if (statut) filter.statut = statut;
    if (statutPaiement) filter['paiement.statut'] = statutPaiement;

    // Récupérer les données avec population
    const depenses = await Depense.find(filter)
      .populate('categorie', 'nom')
      .populate('beneficiaire', 'nom type matriculeFiscal')
      .sort('-dateDepense');

    // Préparer le répertoire pour le fichier d'export
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const fileName = `export_depenses_${Date.now()}.csv`;
    const filePath = path.join(exportDir, fileName);

    // Configurer le writer CSV
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'categorie', title: 'Catégorie' },
        { id: 'montant', title: 'Montant' },
        { id: 'dateDepense', title: 'Date de la dépense' },
        { id: 'beneficiaire', title: 'Bénéficiaire' },
        { id: 'description', title: 'Description' },
        { id: 'statutPaiement', title: 'Statut de paiement' },
        { id: 'modePaiement', title: 'Mode de paiement' },
        { id: 'datePaiement', title: 'Date de paiement' },
        { id: 'reference', title: 'Référence' },
        { id: 'estRecurrente', title: 'Récurrente' },
        { id: 'justificatifs', title: 'Justificatifs' }
      ]
    });

    // Formater les données pour CSV
    const records = depenses.map(dep => ({
      categorie: dep.categorie ? dep.categorie.nom : 'Non catégorisé',
      montant: dep.montant.toFixed(2),
      dateDepense: new Date(dep.dateDepense).toLocaleDateString(),
      beneficiaire: dep.beneficiaire ? dep.beneficiaire.nom : 'Non spécifié',
      description: dep.description,
      statutPaiement: dep.paiement.statut,
      modePaiement: dep.paiement.modePaiement,
      datePaiement: dep.paiement.datePaiement ? new Date(dep.paiement.datePaiement).toLocaleDateString() : '',
      reference: dep.paiement.reference,
      estRecurrente: dep.estRecurrente ? 'Oui' : 'Non',
      justificatifs: dep.justificatifs.length > 0 ? `${dep.justificatifs.length} fichier(s)` : 'Aucun'
    }));

    // Écrire le fichier CSV
    await csvWriter.writeRecords(records);

    // Envoyer le fichier
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Erreur lors de l\'envoi du fichier:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'envoi du fichier d\'export'
        });
      }
      
      // Supprimer le fichier après envoi
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Erreur lors de l\'export des dépenses en CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export des dépenses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Exporter les dépenses en Excel
exports.exportDepensesExcel = async (req, res) => {
  try {
    const {
      dateDebut,
      dateFin,
      categorie,
      beneficiaire,
      statut,
      statutPaiement
    } = req.query;

    // Construire les filtres
    const filter = { entrepriseId: req.user.entrepriseId };
    
    if (dateDebut && dateFin) {
      filter.dateDepense = {
        $gte: new Date(dateDebut),
        $lte: new Date(dateFin)
      };
    } else if (dateDebut) {
      filter.dateDepense = { $gte: new Date(dateDebut) };
    } else if (dateFin) {
      filter.dateDepense = { $lte: new Date(dateFin) };
    }
    
    if (categorie) filter.categorie = categorie;
    if (beneficiaire) filter.beneficiaire = beneficiaire;
    if (statut) filter.statut = statut;
    if (statutPaiement) filter['paiement.statut'] = statutPaiement;

    // Récupérer les données avec population
    const depenses = await Depense.find(filter)
      .populate('categorie', 'nom couleur')
      .populate('beneficiaire', 'nom type matriculeFiscal')
      .populate({
        path: 'paiement.banque',
        select: 'nom',
        model: 'CompteBancaire'
      })
      .sort('-dateDepense');

    // Calculer le total des dépenses
    const totalDepenses = depenses.reduce((sum, dep) => sum + dep.montant, 0);

    // Préparer le répertoire pour le fichier d'export
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const fileName = `export_depenses_${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Dépenses');

    // Définir les colonnes
    worksheet.columns = [
      { header: 'Catégorie', key: 'categorie', width: 20 },
      { header: 'Montant', key: 'montant', width: 15 },
      { header: 'Date', key: 'dateDepense', width: 15 },
      { header: 'Bénéficiaire', key: 'beneficiaire', width: 25 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Statut de paiement', key: 'statutPaiement', width: 15 },
      { header: 'Mode de paiement', key: 'modePaiement', width: 15 },
      { header: 'Banque', key: 'banque', width: 15 },
      { header: 'Date de paiement', key: 'datePaiement', width: 15 },
      { header: 'Référence', key: 'reference', width: 15 },
      { header: 'Récurrente', key: 'estRecurrente', width: 10 }
    ];

    // Style des en-têtes
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };

    // Ajouter les données
    depenses.forEach(dep => {
      worksheet.addRow({
        categorie: dep.categorie ? dep.categorie.nom : 'Non catégorisé',
        montant: dep.montant,
        dateDepense: new Date(dep.dateDepense),
        beneficiaire: dep.beneficiaire ? dep.beneficiaire.nom : 'Non spécifié',
        description: dep.description,
        statutPaiement: dep.paiement.statut,
        modePaiement: dep.paiement.modePaiement,
        banque: dep.paiement.banque ? dep.paiement.banque.nom : '',
        datePaiement: dep.paiement.datePaiement ? new Date(dep.paiement.datePaiement) : null,
        reference: dep.paiement.reference,
        estRecurrente: dep.estRecurrente ? 'Oui' : 'Non'
      });
    });

    // Formater la colonne des montants
    worksheet.getColumn('montant').numFmt = '# ##0,00 €';
    worksheet.getColumn('dateDepense').numFmt = 'dd/mm/yyyy';
    worksheet.getColumn('datePaiement').numFmt = 'dd/mm/yyyy';

    // Alternance de couleurs pour les lignes
    for (let i = 2; i <= depenses.length + 1; i++) {
      if (i % 2 === 0) {
        worksheet.getRow(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }
    }

    // Ajouter une ligne de total
    const totalRow = worksheet.addRow({
      categorie: 'TOTAL',
      montant: totalDepenses
    });
    totalRow.font = { bold: true };
    totalRow.getCell('montant').numFmt = '# ##0,00 €';

    // Créer un deuxième onglet avec un résumé par catégorie
    const resumeSheet = workbook.addWorksheet('Résumé par catégorie');
    resumeSheet.columns = [
      { header: 'Catégorie', key: 'categorie', width: 20 },
      { header: 'Montant total', key: 'montant', width: 15 },
      { header: 'Nombre de dépenses', key: 'count', width: 20 },
      { header: 'Montant moyen', key: 'moyenne', width: 15 },
      { header: '% du total', key: 'pourcentage', width: 15 }
    ];

    // Style des en-têtes
    resumeSheet.getRow(1).font = { bold: true };
    resumeSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' }
    };
    resumeSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    resumeSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };

    // Regrouper les dépenses par catégorie
    const resumeParCategorie = {};
    depenses.forEach(dep => {
      const categorie = dep.categorie ? dep.categorie.nom : 'Non catégorisé';
      if (!resumeParCategorie[categorie]) {
        resumeParCategorie[categorie] = {
          total: 0,
          count: 0
        };
      }
      resumeParCategorie[categorie].total += dep.montant;
      resumeParCategorie[categorie].count++;
    });

    // Ajouter les données au résumé
    Object.entries(resumeParCategorie).forEach(([categorie, data]) => {
      resumeSheet.addRow({
        categorie,
        montant: data.total,
        count: data.count,
        moyenne: data.total / data.count,
        pourcentage: (data.total / totalDepenses) * 100
      });
    });

    // Formater les colonnes du résumé
    resumeSheet.getColumn('montant').numFmt = '# ##0,00 €';
    resumeSheet.getColumn('moyenne').numFmt = '# ##0,00 €';
    resumeSheet.getColumn('pourcentage').numFmt = '0.0 %';

    // Créer un graphique
    const chartSheet = workbook.addWorksheet('Graphiques');
    
    // Sauvegarder le fichier
    await workbook.xlsx.writeFile(filePath);

    // Envoyer le fichier
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Erreur lors de l\'envoi du fichier Excel:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de l\'envoi du fichier d\'export'
        });
      }
      
      // Supprimer le fichier après envoi
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('Erreur lors de l\'export des dépenses en Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export des dépenses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Récupérer les dépenses au format calendrier
exports.getDepensesCalendrier = async (req, res) => {
  try {
    const { annee, mois } = req.query;
    
    // Déterminer la période demandée
    const dateDebut = new Date(annee || new Date().getFullYear(), mois ? mois - 1 : 0, 1);
    const dateFin = new Date(annee || new Date().getFullYear(), mois ? mois : 12, 0);
    
    // Récupérer les dépenses dans l'intervalle
    const depenses = await Depense.find({
      entrepriseId: req.user.entrepriseId,
      dateDepense: { $gte: dateDebut, $lte: dateFin },
      statut: 'ACTIVE'
    })
    .populate('categorie', 'nom couleur icone')
    .populate('beneficiaire', 'nom')
    .sort('dateDepense');
    
    // Transformer les dépenses en événements calendrier
    const evenements = depenses.map(dep => ({
      id: dep._id,
      title: dep.description || (dep.beneficiaire ? dep.beneficiaire.nom : 'Dépense'),
      start: dep.dateDepense,
      end: dep.dateDepense,
      allDay: true,
      backgroundColor: dep.categorie ? dep.categorie.couleur : '#CCCCCC',
      borderColor: dep.categorie ? dep.categorie.couleur : '#CCCCCC',
      textColor: '#FFFFFF',
      extendedProps: {
        montant: dep.montant,
        categorie: dep.categorie ? dep.categorie.nom : 'Non catégorisé',
        beneficiaire: dep.beneficiaire ? dep.beneficiaire.nom : 'Non spécifié',
        statut: dep.paiement.statut,
        estRecurrente: dep.estRecurrente,
        description: dep.description
      }
    }));
    
    res.status(200).json({
      success: true,
      data: evenements
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses au format calendrier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des dépenses au format calendrier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Configurer les notifications pour une dépense récurrente
exports.configureNotifications = async (req, res) => {
  try {
    const { 
      delaiPreAvis, 
      canauxNotification, 
      rappelsNonPaiement 
    } = req.body;
    
    // Vérifier que la dépense existe et appartient à l'entreprise de l'utilisateur
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }
    
    if (!depense.estRecurrente) {
      return res.status(400).json({
        success: false,
        message: 'Cette dépense n\'est pas récurrente'
      });
    }
    
    // Mettre à jour la configuration des notifications
    const updatedDepense = await Depense.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'notifications.delaiPreAvis': delaiPreAvis,
          'notifications.canaux': canauxNotification,
          'notifications.rappelsNonPaiement': rappelsNonPaiement
        }
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedDepense,
      message: 'Configuration des notifications mise à jour avec succès'
    });
  } catch (error) {
    console.error(`Erreur lors de la configuration des notifications pour la dépense ${req.params.id}:`, error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la configuration des notifications',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Payer une occurrence de dépense récurrente
exports.payerOccurrence = async (req, res) => {
  try {
    const { datePaiement, reference, banque } = req.body;
    
    // Vérifier que la dépense existe et appartient à l'entreprise de l'utilisateur
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }
    
    // Mettre à jour le statut de paiement
    const updatedDepense = await Depense.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'paiement.statut': 'PAYEE',
          'paiement.datePaiement': datePaiement ? new Date(datePaiement) : new Date(),
          'paiement.reference': reference || '',
          'paiement.banque': banque
        }
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedDepense,
      message: 'Paiement enregistré avec succès'
    });
  } catch (error) {
    console.error(`Erreur lors du paiement de la dépense ${req.params.id}:`, error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de l\'enregistrement du paiement',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Obtenir les dépenses à échéance pour les notifications
exports.getDepensesNotification = async (req, res) => {
  try {
    const today = new Date();
    const delaiMax = 30; // Maximum 30 jours d'avance pour les notifications
    
    // Date limite pour les notifications (aujourd'hui + delaiMax jours)
    const dateLimite = new Date(today);
    dateLimite.setDate(dateLimite.getDate() + delaiMax);
    
    // Récupérer toutes les dépenses actives à payer dans l'intervalle
    const depensesEcheance = await Depense.find({
      entrepriseId: req.user.entrepriseId,
      dateDepense: { $gte: today, $lte: dateLimite },
      'paiement.statut': 'A_PAYER',
      statut: 'ACTIVE'
    })
    .populate('categorie', 'nom')
    .populate('beneficiaire', 'nom')
    .sort('dateDepense');
    
    // Filtrer selon les délais de préavis configurés
    const notifications = depensesEcheance.filter(dep => {
      const joursDifference = Math.ceil((dep.dateDepense - today) / (1000 * 60 * 60 * 24));
      
      // Si la dépense a une configuration de notification spécifique
      if (dep.notifications && dep.notifications.delaiPreAvis >= joursDifference) {
        return true;
      }
      
      // Par défaut, notifier pour les dépenses à échéance dans les 7 jours
      return joursDifference <= 7;
    });
    
    // Regrouper par urgence
    const notificationsGroupees = {
      urgent: [], // Échéance aujourd'hui ou dépassée
      procheEcheance: [], // Dans les 3 jours
      aVenir: [] // Au-delà de 3 jours
    };
    
    notifications.forEach(dep => {
      const joursDifference = Math.ceil((dep.dateDepense - today) / (1000 * 60 * 60 * 24));
      
      if (joursDifference <= 0) {
        notificationsGroupees.urgent.push(dep);
      } else if (joursDifference <= 3) {
        notificationsGroupees.procheEcheance.push(dep);
      } else {
        notificationsGroupees.aVenir.push(dep);
      }
    });
    
    res.status(200).json({
      success: true,
      data: notificationsGroupees,
      count: {
        total: notifications.length,
        urgent: notificationsGroupees.urgent.length,
        procheEcheance: notificationsGroupees.procheEcheance.length,
        aVenir: notificationsGroupees.aVenir.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses à notifier:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des dépenses à notifier',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Récupérer l'historique des occurrences d'une dépense récurrente
exports.getHistoriqueOccurrences = async (req, res) => {
  try {
    // Vérifier que la dépense existe et appartient à l'entreprise de l'utilisateur
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId,
      estRecurrente: true
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense récurrente non trouvée'
      });
    }
    
    // Récupérer toutes les occurrences générées
    const occurrences = await Depense.find({
      occurrenceParent: depense._id,
      entrepriseId: req.user.entrepriseId
    })
    .populate('categorie', 'nom couleur')
    .populate('beneficiaire', 'nom')
    .sort('dateDepense');
    
    // Ajouter la dépense parent à la liste
    const toutesOccurrences = [
      {
        ...depense.toObject(),
        estParent: true
      },
      ...occurrences
    ].sort((a, b) => new Date(a.dateDepense) - new Date(b.dateDepense));
    
   // Calculer des statistiques sur les paiements
    const statistiques = {
      total: toutesOccurrences.length,
      payees: toutesOccurrences.filter(o => o.paiement.statut === 'PAYEE').length,
      aPayer: toutesOccurrences.filter(o => o.paiement.statut === 'A_PAYER').length,
      enRetard: toutesOccurrences.filter(o => 
        o.paiement.statut === 'A_PAYER' && new Date(o.dateDepense) < new Date()
      ).length,
      montantTotal: toutesOccurrences.reduce((sum, o) => sum + o.montant, 0),
      montantPaye: toutesOccurrences
        .filter(o => o.paiement.statut === 'PAYEE')
        .reduce((sum, o) => sum + o.montant, 0)
    };
    
    res.status(200).json({
      success: true,
      data: {
        depenseParent: depense,
        occurrences: toutesOccurrences,
        statistiques
      }
    });
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'historique des occurrences: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique des occurrences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Annuler une occurrence spécifique
exports.annulerOccurrence = async (req, res) => {
  try {
    // Vérifier que la dépense existe et appartient à l'entreprise de l'utilisateur
    const occurrence = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId,
      occurrenceParent: { $exists: true, $ne: null }
    });
    
    if (!occurrence) {
      return res.status(404).json({
        success: false,
        message: 'Occurrence de dépense non trouvée'
      });
    }
    
    // Mettre à jour le statut de l'occurrence
    const updatedOccurrence = await Depense.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          statut: 'ANNULEE',
          'paiement.statut': 'ANNULEE',
          notes: occurrence.notes ? 
            `${occurrence.notes}\n[${new Date().toLocaleDateString()}] - Occurrence annulée` : 
            `[${new Date().toLocaleDateString()}] - Occurrence annulée`
        }
      },
      { new: true, runValidators: true }
    );
    
    // Mettre à jour la dépense parente pour refléter l'annulation
    await Depense.findByIdAndUpdate(
      occurrence.occurrenceParent,
      {
        $set: {
          notes: `Une occurrence a été annulée le ${new Date().toLocaleDateString()}`
        }
      }
    );
    
    res.status(200).json({
      success: true,
      data: updatedOccurrence,
      message: 'Occurrence annulée avec succès'
    });
  } catch (error) {
    console.error(`Erreur lors de l'annulation de l'occurrence: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de l\'occurrence',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Régénérer les occurrences futures d'une dépense récurrente
exports.regenererOccurrences = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Vérifier que la dépense existe et est récurrente
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId,
      estRecurrente: true
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense récurrente non trouvée'
      });
    }
    
    // Supprimer toutes les occurrences futures qui ne sont pas encore payées
    const today = new Date();
    const occurrencesSupprimer = await Depense.find({
      occurrenceParent: depense._id,
      dateDepense: { $gt: today },
      'paiement.statut': 'A_PAYER',
      entrepriseId: req.user.entrepriseId
    });
    
    const idsASupprimer = occurrencesSupprimer.map(o => o._id);
    
    await Depense.deleteMany(
      { _id: { $in: idsASupprimer } },
      { session }
    );
    
    // Mettre à jour les occurrences générées dans la dépense parent
    const occurrencesRestantes = await Depense.find({
      occurrenceParent: depense._id,
      entrepriseId: req.user.entrepriseId
    });
    
    const idsRestants = occurrencesRestantes.map(o => o._id);
    
    // Générer de nouvelles occurrences à partir d'aujourd'hui
    let derniereDate;
    
    // Trouver la date de la dernière occurrence existante
    if (occurrencesRestantes.length > 0) {
      const datesTri = occurrencesRestantes.map(o => new Date(o.dateDepense)).sort((a, b) => b - a);
      derniereDate = datesTri[0];
    } else {
      derniereDate = new Date(depense.dateDepense);
    }
    
    // Cloner la dépense pour la régénération mais actualiser la date de début
    const depenseClone = {
      ...depense.toObject(),
      periodicite: {
        ...depense.periodicite,
        dateDebut: new Date(derniereDate)
      }
    };
    
    // Appeler la fonction de génération
    const nouvellesOccurrencesIDs = await genererOccurrencesRecurrentes(depenseClone);
    
    // Mettre à jour la liste des occurrences dans la dépense parent
    const toutesOccurrencesIDs = [...idsRestants, ...nouvellesOccurrencesIDs];
    
    await Depense.findByIdAndUpdate(
      depense._id,
      { $set: { occurrencesGenerees: toutesOccurrencesIDs } },
      { session }
    );
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      message: 'Occurrences futures régénérées avec succès',
      data: {
        supprimees: idsASupprimer.length,
        nouvelles: nouvellesOccurrencesIDs.length,
        total: toutesOccurrencesIDs.length
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(`Erreur lors de la régénération des occurrences: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la régénération des occurrences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// Modifier plusieurs occurrences en même temps
exports.modifierOccurrencesEnMasse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { idsOccurrences, modifications } = req.body;
    
    if (!idsOccurrences || !Array.isArray(idsOccurrences) || idsOccurrences.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune occurrence sélectionnée'
      });
    }
    
    // Vérifier que les occurrences appartiennent à l'entreprise de l'utilisateur
    const occurrences = await Depense.find({
      _id: { $in: idsOccurrences },
      entrepriseId: req.user.entrepriseId
    });
    
    if (occurrences.length !== idsOccurrences.length) {
      return res.status(404).json({
        success: false,
        message: 'Certaines occurrences n\'ont pas été trouvées'
      });
    }
    
    // Préparer les modifications
    const updateData = {};
    const { montant, categorie, beneficiaire, description, modePaiement, banque } = modifications;
    
    if (montant !== undefined) updateData.montant = montant;
    if (categorie !== undefined) updateData.categorie = categorie;
    if (beneficiaire !== undefined) updateData.beneficiaire = beneficiaire;
    if (description !== undefined) updateData.description = description;
    if (modePaiement !== undefined) updateData['paiement.modePaiement'] = modePaiement;
    if (banque !== undefined) updateData['paiement.banque'] = banque;
    
    // Mettre à jour toutes les occurrences sélectionnées
    await Depense.updateMany(
      { _id: { $in: idsOccurrences } },
      { $set: updateData },
      { session }
    );
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      message: `${occurrences.length} occurrences mises à jour avec succès`
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(`Erreur lors de la modification en masse des occurrences: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification en masse des occurrences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};

// Système de notification intelligent
// Récupérer les dépenses à notifier selon les configurations
exports.getNotificationsIntelligentes = async (req, res) => {
  try {
    const today = new Date();
    
    // 1. Dépenses à échéance aujourd'hui
    const depensesAujourdhui = await Depense.find({
      entrepriseId: req.user.entrepriseId,
      dateDepense: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      },
      'paiement.statut': 'A_PAYER',
      statut: 'ACTIVE'
    })
    .populate('categorie', 'nom couleur')
    .populate('beneficiaire', 'nom');
    
    // 2. Dépenses à échéance prochaine selon les délais de préavis configurés
    const prochaines = await Depense.aggregate([
      {
        $match: {
          entrepriseId: mongoose.Types.ObjectId(req.user.entrepriseId),
          dateDepense: { $gt: today },
          'paiement.statut': 'A_PAYER',
          statut: 'ACTIVE'
        }
      },
      {
        $addFields: {
          joursDifference: {
            $divide: [
              { $subtract: ["$dateDepense", today] },
              1000 * 60 * 60 * 24 // Convertir millisecondes en jours
            ]
          }
        }
      },
      {
        $match: {
          $or: [
            // Soit le préavis configuré est >= aux jours de différence
            {
              "notifications.delaiPreAvis": { $exists: true },
              $expr: { $lte: ["$joursDifference", "$notifications.delaiPreAvis"] }
            },
            // Soit le préavis par défaut (7 jours) est >= aux jours de différence
            { $expr: { $lte: ["$joursDifference", 7] } }
          ]
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "categorie",
          foreignField: "_id",
          as: "categorieInfo"
        }
      },
      {
        $lookup: {
          from: "tiers",
          localField: "beneficiaire",
          foreignField: "_id",
          as: "beneficiaireInfo"
        }
      },
      {
        $addFields: {
          categorie: { $arrayElemAt: ["$categorieInfo", 0] },
          beneficiaire: { $arrayElemAt: ["$beneficiaireInfo", 0] }
        }
      },
      {
        $project: {
          categorieInfo: 0,
          beneficiaireInfo: 0
        }
      },
      {
        $sort: { joursDifference: 1 }
      }
    ]);
    
    // 3. Dépenses en retard pour escalade de notifications
    const depensesRetard = await Depense.find({
      entrepriseId: req.user.entrepriseId,
      dateDepense: { $lt: today },
      'paiement.statut': 'A_PAYER',
      statut: 'ACTIVE'
    })
    .populate('categorie', 'nom couleur')
    .populate('beneficiaire', 'nom')
    .sort('dateDepense');
    
    // Organiser les retards par niveaux d'escalade
    const escaladeRetards = {
      leger: [], // 1-3 jours
      moyen: [], // 4-7 jours
      important: [], // 8-14 jours
      critique: [] // 15+ jours
    };
    
    depensesRetard.forEach(dep => {
      const joursRetard = Math.floor((today - new Date(dep.dateDepense)) / (1000 * 60 * 60 * 24));
      
      if (joursRetard <= 3) {
        escaladeRetards.leger.push({...dep.toObject(), joursRetard});
      } else if (joursRetard <= 7) {
        escaladeRetards.moyen.push({...dep.toObject(), joursRetard});
      } else if (joursRetard <= 14) {
        escaladeRetards.important.push({...dep.toObject(), joursRetard});
      } else {
        escaladeRetards.critique.push({...dep.toObject(), joursRetard});
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        aujourdhui: depensesAujourdhui,
        prochaines: prochaines.filter(d => {
          // Filtrer pour exclure celles d'aujourd'hui qui sont déjà dans le premier groupe
          const dateDepense = new Date(d.dateDepense);
          return dateDepense.getDate() !== today.getDate() || 
                 dateDepense.getMonth() !== today.getMonth() || 
                 dateDepense.getFullYear() !== today.getFullYear();
        }),
        retards: escaladeRetards,
        statistiques: {
          total: depensesAujourdhui.length + prochaines.length + depensesRetard.length,
          aujourdhui: depensesAujourdhui.length,
          prochaines: prochaines.length,
          retard: depensesRetard.length
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications intelligentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications intelligentes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Programmer une notification pour une dépense spécifique
exports.programmerNotification = async (req, res) => {
  try {
    const { 
      dateNotification, 
      canaux, 
      message,
      destinataires 
    } = req.body;
    
    // Vérifier que la dépense existe et appartient à l'entreprise
    const depense = await Depense.findOne({
      _id: req.params.id,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!depense) {
      return res.status(404).json({
        success: false,
        message: 'Dépense non trouvée'
      });
    }
    
    // Créer la notification programmée
    const notification = {
      dateNotification: new Date(dateNotification),
      canaux: canaux || ['app'],
      message: message || `Rappel: Dépense de ${depense.montant}€ à payer le ${new Date(depense.dateDepense).toLocaleDateString()}`,
      destinataires: destinataires || [],
      statut: 'PROGRAMMEE',
      dateCreation: new Date()
    };
    
    // Ajouter la notification à la dépense
    await Depense.findByIdAndUpdate(
      req.params.id,
      { $push: { 'notifications.programmees': notification } }
    );
    
    res.status(200).json({
      success: true,
      message: 'Notification programmée avec succès',
      data: notification
    });
  } catch (error) {
    console.error(`Erreur lors de la programmation de la notification: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la programmation de la notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Générer un rapport de dépenses récurrentes
exports.generateReportDepensesRecurrentes = async (req, res) => {
  try {
    const { annee, mois } = req.query;
    const entrepriseId = req.user.entrepriseId;
    
    // Déterminer la période d'analyse
    const dateDebut = new Date(annee || new Date().getFullYear(), mois ? mois - 1 : 0, 1);
    const dateFin = new Date(annee || new Date().getFullYear(), mois ? mois : 12, 0);
    
    // Récupérer toutes les dépenses récurrentes
    const depensesRecurrentes = await Depense.find({
      entrepriseId,
      estRecurrente: true,
      statut: 'ACTIVE'
    })
    .populate('categorie', 'nom couleur')
    .populate('beneficiaire', 'nom type')
    .sort('dateDepense');
    
    // Récupérer toutes les occurrences pour la période
    const occurrencesPeriode = await Depense.find({
      entrepriseId,
      occurrenceParent: { $exists: true, $ne: null },
      dateDepense: { $gte: dateDebut, $lte: dateFin },
      statut: { $ne: 'ANNULEE' }
    })
    .populate('categorie', 'nom couleur')
    .populate('beneficiaire', 'nom type')
    .populate('occurrenceParent', 'dateDepense description')
    .sort('dateDepense');
    
    // Regrouper les occurrences par dépense parente
    const occurrencesParParent = {};
    
    occurrencesPeriode.forEach(occ => {
      const parentId = occ.occurrenceParent ? occ.occurrenceParent._id.toString() : 'unknown';
      
      if (!occurrencesParParent[parentId]) {
        occurrencesParParent[parentId] = [];
      }
      
      occurrencesParParent[parentId].push(occ);
    });
    
    // Calculer des statistiques
    const statistiques = {
      nbDepensesRecurrentes: depensesRecurrentes.length,
      nbOccurrencesPeriode: occurrencesPeriode.length,
      montantTotalPeriode: occurrencesPeriode.reduce((sum, occ) => sum + occ.montant, 0),
      montantPayePeriode: occurrencesPeriode
        .filter(occ => occ.paiement.statut === 'PAYEE')
        .reduce((sum, occ) => sum + occ.montant, 0),
      nbEcheancesFutures: occurrencesPeriode
        .filter(occ => new Date(occ.dateDepense) > new Date())
        .length,
      nbRetards: occurrencesPeriode
        .filter(occ => occ.paiement.statut === 'A_PAYER' && new Date(occ.dateDepense) < new Date())
        .length
    };
    
    // Regrouper par catégorie
    const parCategorie = {};
    
    occurrencesPeriode.forEach(occ => {
      const categorieNom = occ.categorie ? occ.categorie.nom : 'Non catégorisé';
      const categorieId = occ.categorie ? occ.categorie._id.toString() : 'unknown';
      
      if (!parCategorie[categorieId]) {
        parCategorie[categorieId] = {
          nom: categorieNom,
          couleur: occ.categorie ? occ.categorie.couleur : '#CCCCCC',
          count: 0,
          montantTotal: 0,
          occurrences: []
        };
      }
      
      parCategorie[categorieId].count++;
      parCategorie[categorieId].montantTotal += occ.montant;
      parCategorie[categorieId].occurrences.push(occ);
    });
    
    res.status(200).json({
      success: true,
      data: {
        depensesRecurrentes,
        occurrencesPeriode,
        occurrencesParParent,
        parCategorie: Object.values(parCategorie),
        statistiques,
        periode: {
          debut: dateDebut,
          fin: dateFin
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération du rapport des dépenses récurrentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du rapport des dépenses récurrentes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Créer une série de dépenses récurrentes à partir d'un modèle
exports.creerSerieDepenses = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { modeleId, dates, modifications } = req.body;
    
    // Vérifier que le modèle existe
    const modele = await Depense.findOne({
      _id: modeleId,
      entrepriseId: req.user.entrepriseId
    });
    
    if (!modele) {
      return res.status(404).json({
        success: false,
        message: 'Modèle de dépense non trouvé'
      });
    }
    
    // Valider les dates
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir au moins une date pour la série'
      });
    }
    
    // Créer une dépense pour chaque date
    const nouvellesDepenses = [];
    
    for (const dateStr of dates) {
      // Créer une nouvelle dépense basée sur le modèle
      const nouvelleDepense = new Depense({
        categorie: modele.categorie,
        montant: modifications && modifications.montant !== undefined ? 
                   modifications.montant : modele.montant,
        dateDepense: new Date(dateStr),
        beneficiaire: modifications && modifications.beneficiaire ? 
                     modifications.beneficiaire : modele.beneficiaire,
        description: modifications && modifications.description ? 
                    modifications.description : modele.description,
        estRecurrente: false,
        paiement: {
          statut: 'A_PAYER',
          modePaiement: modele.paiement.modePaiement,
          banque: modele.paiement.banque
        },
        entrepriseId: req.user.entrepriseId,
        creePar: req.user._id,
        statut: 'ACTIVE',
        notes: `Créée à partir du modèle: ${modele.description || 'Dépense'} le ${new Date().toLocaleDateString()}`
      });
      
      const savedDepense = await nouvelleDepense.save({ session });
      nouvellesDepenses.push(savedDepense);
    }
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      message: `${nouvellesDepenses.length} dépenses créées avec succès`,
      data: nouvellesDepenses
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Erreur lors de la création de la série de dépenses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la série de dépenses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    session.endSession();
  }
};
/ Mettre à jour une occurrence spécifique
exports.updateOccurrence = async (req, res) => {
  try {
    const { dateDepense, montant, description } = req.body;
    
    // Vérifier que l'occurrence existe
    const occurrence = await Depense.findOne({
      _id: req.params.id,
      occurrenceParent: { $exists: true },
      entrepriseId: req.user.entrepriseId
    });

    if (!occurrence) {
      return res.status(404).json({ 
        success: false,
        message: 'Occurrence non trouvée' 
      });
    }

    // Validation des modifications
    const updates = {};
    if (dateDepense) updates.dateDepense = new Date(dateDepense);
    if (montant) updates.montant = parseFloat(montant);
    if (description) updates.description = description;

    // Appliquer les modifications
    const updatedOccurrence = await Depense.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedOccurrence,
      message: 'Occurrence mise à jour avec succès'
    });

  } catch (error) {
    console.error(`Erreur lors de la mise à jour de l'occurrence: ${error}`);
    res.status(400).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'occurrence',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Système d'escalade des notifications
exports.gestionEscaladeNotifications = async (req, res) => {
  try {
    const joursEscalade = [1, 3, 7]; // Jours après échéance pour les rappels
    
    // Récupérer les dépenses en retard
    const depensesEnRetard = await Depense.find({
      entrepriseId: req.user.entrepriseId,
      'paiement.statut': 'A_PAYER',
      dateDepense: { 
        $lt: new Date(new Date().setHours(0, 0, 0, 0)) 
      },
      statut: 'ACTIVE'
    })
    .populate('beneficiaire', 'nom email')
    .populate('categorie', 'nom');

    // Préparer les notifications d'escalade
    const notifications = depensesEnRetard.map(depense => {
      const joursRetard = Math.floor((new Date() - depense.dateDepense) / (1000 * 60 * 60 * 24));
      const niveauEscalade = joursEscalade.filter(j => j <= joursRetard).length;
      
      return {
        depenseId: depense._id,
        reference: depense.paiement.reference,
        joursRetard,
        niveauEscalade,
        destinataires: this.getDestinatairesEscalade(depense, niveauEscalade),
        message: this.genererMessageEscalade(depense, niveauEscalade)
      };
    });

    // Envoyer les notifications
    await this.envoyerNotifications(notifications);

    res.status(200).json({
      success: true,
      data: notifications,
      message: 'Escalade des notifications traitée avec succès'
    });

  } catch (error) {
    console.error('Erreur dans le système d\'escalade:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement des notifications d\'escalade'
    });
  }
};

// Méthodes helper pour l'escalade
getDestinatairesEscalade = (depense, niveau) => {
  const base = depense.notifications?.canaux || ['APPLICATION'];
  if (niveau >= 2) base.push('EMAIL');
  if (niveau >= 3) base.push('SMS', 'DIRECTION');
  return [...new Set(base)];
};

genererMessageEscalade = (depense, niveau) => {
  const joursRetard = Math.floor((new Date() - depense.dateDepense) / (1000 * 60 * 60 * 24));
  const messages = [
    `Rappel: Dépense #${depense._id} en retard de 1 jour`,
    `URGENT: Dépense #${depense._id} en retard de 3 jours`,
    `CRITIQUE: Dépense #${depense._id} en retard de 7 jours!`
  ];
  return messages[Math.min(niveau - 1, 2)];
};

// [Intégration de l'envoi réel de notifications]
envoyerNotifications = async (notifications) => {
  try {
    for (const notif of notifications) {
      if (notif.destinataires.includes('EMAIL')) {
        await this.envoyerEmailNotification(notif);
      }
      if (notif.destinataires.includes('SMS')) {
        await this.envoyerSMSNotification(notif);
      }
      if (notif.destinataires.includes('APPLICATION')) {
        await this.creerNotificationInterne(notif);
      }
    }
  } catch (error) {
    console.error('Échec d\'envoi de notification:', error);
  }
};

// [Suite des méthodes pour la gestion calendaire]
exports.getCalendrierAvance = async (req, res) => {
  try {
    const { vue, start, end } = req.query; // 'mois', 'semaine', 'jour'
    
    const aggregations = {
      mois: {
        $dateToString: { format: "%Y-%m", date: "$dateDepense" }
      },
      semaine: {
        $dateToString: { format: "%Y-%U", date: "$dateDepense" }
      },
      jour: {
        $dateToString: { format: "%Y-%m-%d", date: "$dateDepense" }
      }
    };

    const result = await Depense.aggregate([
      {
        $match: {
          entrepriseId: mongoose.Types.ObjectId(req.user.entrepriseId),
          dateDepense: { $gte: new Date(start), $lte: new Date(end) }
        }
      },
      {
        $group: {
          _id: aggregations[vue],
          total: { $sum: "$montant" },
          count: { $sum: 1 },
          depenses: { $push: "$$ROOT" }
        }
      },
      {
        $project: {
          periode: "$_id",
          total: 1,
          count: 1,
          depenses: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: result,
      vue,
      periode: { start, end }
    });

  } catch (error) {
    console.error('Erreur du calendrier avancé:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du calendrier'
    });
  }
};

// [Gestion des pièces justificatives avancée]
exports.analyserJustificatifs = async (req, res) => {
  try {
    const { id } = req.params;
    
    const depense = await Depense.findById(id)
      .populate('justificatifs');
    
    // Vérifier la conformité des fichiers
    const analyses = await Promise.all(
      depense.justificatifs.map(async (justificatif) => {
        const cheminFichier = path.join(__dirname, '..', justificatif.chemin);
        return this.analyserFichier(cheminFichier);
      })
    );

    res.status(200).json({
      success: true,
      data: analyses,
      message: 'Analyse des justificatifs complétée'
    });

  } catch (error) {
    console.error('Erreur d\'analyse:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de l\'analyse des justificatifs'
    });
  }
};

// [Méthodes helper pour l'analyse de fichiers]
analyserFichier = async (filePath) => {
  const stats = {
    type: path.extname(filePath).toUpperCase(),
    taille: fs.statSync(filePath).size,
    dateModification: fs.statSync(filePath).mtime,
    probleme: null
  };

  // Exemple de vérification PDF
  if (stats.type === '.PDF') {
    const pdfText = await pdf.parse(filePath);
    stats.ocr = pdfText.text.length > 0;
    if (!stats.ocr) stats.probleme = 'PDF non lisible (image scan non OCRisée)';
  }

  return stats;
};

};

