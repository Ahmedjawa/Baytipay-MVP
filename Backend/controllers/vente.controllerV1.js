// controllers/vente.controller.js
const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const Vente = mongoose.model('Vente');
const LigneTransaction = mongoose.model('LigneTransaction');
const Tiers = mongoose.model('Tiers');
const Article = mongoose.model('Article');
const Paiement = mongoose.model('Paiement');
const Echeance = mongoose.model('Echeance');
const Echeancier = mongoose.model('Echeancier');
const Facture = mongoose.model('Facture');
const Remise = mongoose.model('Remise');
const Document = mongoose.model('Document');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// Fonction utilitaire pour créer une erreur avec un code HTTP
const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Créer une nouvelle vente (étape 1)
exports.initierVente = async (req, res, next) => {
  try {
    const { clientId } = req.body;
    const entrepriseId = req.user.entrepriseId;

    // Vérifier que le client existe
    const client = await Tiers.findOne({ _id: clientId, type: 'CLIENT', entrepriseId });
    if (!client) {
      return next(createError('Client non trouvé', 404));
    }

    // Créer une transaction associée
    const transaction = new Transaction({
      type: 'VENTE',
      tiersId: clientId,
      numeroTransaction: await Transaction.generateNumeroTransaction('VENTE', entrepriseId),
      dateTransaction: new Date(),
      montantTotalHT: 0,
      montantTotalTTC: 0,
      montantTaxes: 0,
      statut: 'BROUILLON',
      entrepriseId,
      creePar: req.user._id
    });

    await transaction.save();

    // Créer la vente
    const vente = new Vente({
      transactionId: transaction._id,
      clientId,
      dateVente: new Date(),
      modePaiement: 'ESPECES', // Par défaut
      statut: 'BROUILLON',
      montantPaye: 0,
      resteAPayer: 0,
      entrepriseId,
      creePar: req.user._id
    });

    await vente.save();

    // Retourner les données nécessaires pour l'étape suivante
    res.status(201).json({
      success: true,
      data: {
        vente,
        transaction,
        client
      }
    });
  } catch (error) {
    next(error);
  }
};

// Ajouter des lignes de transaction (étape 2)
exports.ajouterLignesTransaction = async (req, res, next) => {
  try {
    const { venteId, lignes, remiseGlobale } = req.body;
    const entrepriseId = req.user.entrepriseId;

    // Trouver la vente
    const vente = await Vente.findOne({ _id: venteId, entrepriseId });
    if (!vente || vente.statut !== 'BROUILLON') {
      return next(createError('Vente non trouvée ou déjà validée', 404));
    }

    const transaction = await Transaction.findById(vente.transactionId);
    if (!transaction) {
      return next(createError('Transaction associée non trouvée', 404));
    }

    // Supprimer les lignes existantes pour cette transaction
    await LigneTransaction.deleteMany({ transactionId: transaction._id });
    
    // Supprimer les remises existantes
    await Remise.deleteMany({ transactionId: transaction._id });

    let montantTotalHT = 0;
    let montantTotalTTC = 0;
    let montantTaxes = 0;

    // Créer les nouvelles lignes
    const lignesCreees = [];
    for (const ligne of lignes) {
      const article = ligne.articleId ? 
        await Article.findOne({ _id: ligne.articleId, entrepriseId }) : null;

      const nouvelleLigne = new LigneTransaction({
        transactionId: transaction._id,
        articleId: ligne.articleId,
        description: ligne.description || (article ? article.designation : ''),
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT || (article ? article.prixVenteHT : 0),
        tauxTaxe: ligne.tauxTaxe || (article ? article.tauxTaxe : 0),
        montantHT: ligne.montantHT,
        montantTTC: ligne.montantTTC,
        entrepriseId
      });

      await nouvelleLigne.save();
      lignesCreees.push(nouvelleLigne);

      montantTotalHT += nouvelleLigne.montantHT;
      montantTotalTTC += nouvelleLigne.montantTTC;
      montantTaxes += (nouvelleLigne.montantTTC - nouvelleLigne.montantHT);

      // Ajouter une remise spécifique à la ligne si elle existe
      if (ligne.remise && ligne.remise.valeur > 0) {
        const remiseLigne = new Remise({
          transactionId: transaction._id,
          ligneTransactionId: nouvelleLigne._id,
          type: ligne.remise.type,
          valeur: ligne.remise.valeur,
          montant: ligne.remise.montant,
          description: `Remise sur ${nouvelleLigne.description}`,
          estGlobale: false,
          entrepriseId
        });
        await remiseLigne.save();
      }
    }

    // Ajouter une remise globale si spécifiée
    if (remiseGlobale && remiseGlobale.valeur > 0) {
      const montantRemiseGlobale = remiseGlobale.type === 'POURCENTAGE' ?
        (montantTotalHT * remiseGlobale.valeur / 100) : remiseGlobale.valeur;
      
      const remiseGlobaleObj = new Remise({
        transactionId: transaction._id,
        type: remiseGlobale.type,
        valeur: remiseGlobale.valeur,
        montant: montantRemiseGlobale,
        description: 'Remise globale',
        estGlobale: true,
        entrepriseId
      });
      await remiseGlobaleObj.save();

      // Appliquer la remise globale aux totaux
      const facteurRemise = 1 - (montantRemiseGlobale / montantTotalHT);
      montantTotalHT = montantTotalHT * facteurRemise;
      montantTotalTTC = montantTotalTTC * facteurRemise;
      montantTaxes = montantTaxes * facteurRemise;

      // Mettre à jour la vente avec la remise globale
      vente.remiseGlobale = remiseGlobale.type === 'POURCENTAGE' ? 
        remiseGlobale.valeur : (remiseGlobale.valeur / montantTotalHT * 100);
    }

    // Mettre à jour la transaction avec les nouveaux totaux
    transaction.montantTotalHT = parseFloat(montantTotalHT.toFixed(2));
    transaction.montantTotalTTC = parseFloat(montantTotalTTC.toFixed(2));
    transaction.montantTaxes = parseFloat(montantTaxes.toFixed(2));
    await transaction.save();

    // Mettre à jour la vente
    vente.resteAPayer = transaction.montantTotalTTC;
    await vente.save();

    res.status(200).json({
      success: true,
      data: {
        vente,
        transaction,
        lignes: lignesCreees
      }
    });
  } catch (error) {
    next(error);
  }
};

// Définir le mode de paiement (étape 3)
exports.definirPaiement = async (req, res, next) => {
  try {
    const { venteId, modePaiement, paiements } = req.body;
    const entrepriseId = req.user.entrepriseId;

    // Trouver la vente
    const vente = await Vente.findOne({ _id: venteId, entrepriseId });
    if (!vente || vente.statut !== 'BROUILLON') {
      return next(createError('Vente non trouvée ou déjà validée', 404));
    }

    const transaction = await Transaction.findById(vente.transactionId);
    if (!transaction) {
      return next(createError('Transaction associée non trouvée', 404));
    }

    // Mettre à jour le mode de paiement
    vente.modePaiement = modePaiement;
    await vente.save();

    // Supprimer les paiements existants
    await Paiement.deleteMany({ transactionId: vente.transactionId });

    // Traiter les paiements selon le mode
    let montantTotal = 0;
    const paiementsCreees = [];

    if (paiements && paiements.length > 0) {
      for (const p of paiements) {
        const nouveauPaiement = new Paiement({
          transactionId: vente.transactionId,
          type: p.type,
          montant: p.montant,
          datePaiement: p.datePaiement || new Date(),
          reference: p.reference,
          banque: p.banque,
          statut: p.statut || 'EN_ATTENTE',
          notesPaiement: p.notesPaiement,
          entrepriseId,
          creePar: req.user._id
        });

        await nouveauPaiement.save();
        paiementsCreees.push(nouveauPaiement);
        montantTotal += nouveauPaiement.montant;
      }
    }

    // Pour paiement immédiat (espèces)
    if (modePaiement === 'ESPECES' && paiements && paiements.length === 1) {
      vente.montantPaye = montantTotal;
      vente.resteAPayer = transaction.montantTotalTTC - montantTotal;
      
      // Si payé en totalité
      if (Math.abs(vente.resteAPayer) < 0.01) {
        vente.statut = 'PAYEE';
        transaction.statut = 'VALIDEE';
      }
    }

    await vente.save();
    await transaction.save();

    res.status(200).json({
      success: true,
      data: {
        vente,
        transaction,
        paiements: paiementsCreees
      }
    });
  } catch (error) {
    next(error);
  }
};

// Créer un échéancier (étape 4)
exports.creerEcheancier = async (req, res, next) => {
  try {
    const { venteId, echeances } = req.body;
    const entrepriseId = req.user.entrepriseId;

    // Trouver la vente
    const vente = await Vente.findOne({ _id: venteId, entrepriseId });
    if (!vente) {
      return next(createError('Vente non trouvée', 404));
    }

    const transaction = await Transaction.findById(vente.transactionId);
    if (!transaction) {
      return next(createError('Transaction associée non trouvée', 404));
    }

    // Vérifier si le paiement nécessite un échéancier
    const modesAvecEcheancier = ['CHEQUES_MULTIPLES', 'EFFETS_MULTIPLES', 'PAIEMENT_MIXTE'];
    if (!modesAvecEcheancier.includes(vente.modePaiement) && !req.body.forceEcheancier) {
      return next(createError('Ce mode de paiement ne nécessite pas d\'échéancier', 400));
    }

    // Supprimer les échéances existantes
    await Echeance.deleteMany({ transactionId: vente.transactionId });

    // Supprimer l'échéancier existant
    await Echeancier.deleteMany({ transactionId: vente.transactionId });

    // Vérifier que le total des échéances correspond au montant de la vente
    const montantTotalEcheances = echeances.reduce((sum, e) => sum + e.montant, 0);
    if (Math.abs(montantTotalEcheances - transaction.montantTotalTTC) > 0.01) {
      return next(createError(`Le total des échéances (${montantTotalEcheances}) ne correspond pas au montant de la vente (${transaction.montantTotalTTC})`, 400));
    }

    // Créer le nouvel échéancier
    const echeancier = new Echeancier({
      transactionId: vente.transactionId,
      venteId: vente._id,
      montantTotal: transaction.montantTotalTTC,
      nombreEcheances: echeances.length,
      statut: 'ACTIF',
      notesEcheancier: req.body.notesEcheancier || '',
      entrepriseId,
      creePar: req.user._id
    });

    await echeancier.save();

    // Créer les échéances individuelles
    const echeancesCreees = [];
    for (const e of echeances) {
      const nouvelleEcheance = new Echeance({
        transactionId: vente.transactionId,
        echeancier: echeancier._id,
        dateEcheance: e.dateEcheance,
        montant: e.montant,
        typePaiement: e.typePaiement, // CHEQUE, EFFET, etc.
        numeroReference: e.numeroReference, // Numéro du chèque/effet
        banque: e.banque,
        statut: 'A_RECEVOIR',
        entrepriseId
      });

      await nouvelleEcheance.save();
      echeancesCreees.push(nouvelleEcheance);
    }

    // Mettre à jour la vente avec la date d'échéance finale (celle la plus éloignée)
    if (echeancesCreees.length > 0) {
      const datesDEcheance = echeancesCreees.map(e => e.dateEcheance);
      vente.dateEcheance = new Date(Math.max(...datesDEcheance));
      await vente.save();
    }

    res.status(200).json({
      success: true,
      data: {
        vente,
        transaction,
        echeancier,
        echeances: echeancesCreees
      }
    });
  } catch (error) {
    next(error);
  }
};

// Générer un échéancier automatique
exports.genererEcheancierAuto = async (req, res, next) => {
  try {
    const { venteId, nombreEcheances, dateDebut, intervalleJours } = req.body;
    const entrepriseId = req.user.entrepriseId;

    // Trouver la vente
    const vente = await Vente.findOne({ _id: venteId, entrepriseId });
    if (!vente) {
      return next(createError('Vente non trouvée', 404));
    }

    const transaction = await Transaction.findById(vente.transactionId);
    if (!transaction) {
      return next(createError('Transaction associée non trouvée', 404));
    }

    // Créer/mettre à jour l'échéancier
    let echeancier = await Echeancier.findOne({ transactionId: transaction._id });
    
    if (!echeancier) {
      echeancier = new Echeancier({
        transactionId: transaction._id,
        venteId: vente._id,
        montantTotal: transaction.montantTotalTTC,
        nombreEcheances,
        statut: 'ACTIF',
        entrepriseId,
        creePar: req.user._id
      });
      await echeancier.save();
    } else {
      echeancier.nombreEcheances = nombreEcheances;
      echeancier.montantTotal = transaction.montantTotalTTC;
      await echeancier.save();
    }

    // Générer les échéances automatiquement
    const echeances = await echeancier.genererEcheancesEquitables(
      dateDebut || new Date(),
      intervalleJours || 30
    );

    res.status(200).json({
      success: true,
      data: {
        vente,
        transaction,
        echeancier,
        echeances
      }
    });
  } catch (error) {
    next(error);
  }
};

// Valider une vente (étape 5)
exports.validerVente = async (req, res, next) => {
  try {
    const { venteId } = req.params;
    const entrepriseId = req.user.entrepriseId;

    // Trouver la vente
    const vente = await Vente.findOne({ _id: venteId, entrepriseId });
    if (!vente || vente.statut !== 'BROUILLON') {
      return next(createError('Vente non trouvée ou ne peut pas être validée', 404));
    }

    const transaction = await Transaction.findById(vente.transactionId);
    if (!transaction) {
      return next(createError('Transaction associée non trouvée', 404));
    }

    // Vérifier que la vente contient des lignes
    const lignes = await LigneTransaction.find({ transactionId: transaction._id });
    if (lignes.length === 0) {
      return next(createError('Impossible de valider une vente sans articles', 400));
    }

    // Si le mode de paiement nécessite un échéancier, vérifier qu'il existe
    const modesAvecEcheancier = ['CHEQUES_MULTIPLES', 'EFFETS_MULTIPLES', 'PAIEMENT_MIXTE'];
    if (modesAvecEcheancier.includes(vente.modePaiement)) {
      const echeancier = await Echeancier.findOne({ transactionId: transaction._id });
      if (!echeancier) {
        return next(createError('Un échéancier est requis pour ce mode de paiement', 400));
      }

      // Vérifier que l'échéancier est équilibré
      const estEquilibre = await echeancier.estEquilibre();
      if (!estEquilibre) {
        return next(createError('L\'échéancier n\'est pas équilibré avec le montant de la vente', 400));
      }
    }

    // Mettre à jour le statut de la vente et de la transaction
    if (vente.montantPaye >= transaction.montantTotalTTC) {
      vente.statut = 'PAYEE';
    } else if (vente.montantPaye > 0) {
      vente.statut = 'PARTIELLEMENT_PAYEE';
    } else {
      vente.statut = 'VALIDEE';
    }

    transaction.statut = 'VALIDEE';

    await vente.save();
    await transaction.save();

    // Créer une facture associée
    const numeroFacture = await Facture.genererNumeroFacture(entrepriseId);
    
    const facture = new Facture({
      transactionId: transaction._id,
      venteId: vente._id,
      numeroFacture,
      dateFacture: new Date(),
      dateEcheance: vente.dateEcheance,
      statut: vente.statut,
      entrepriseId,
      creePar: req.user._id
    });

    await facture.save();

    res.status(200).json({
      success: true,
      data: {
        vente,
        transaction,
        facture
      }
    });
  } catch (error) {
    next(error);
  }
};

// Générer un PDF pour une facture
exports.genererFacturePDF = async (req, res, next) => {
  try {
    const { factureId } = req.params;
    const entrepriseId = req.user.entrepriseId;

    // Récupérer la facture avec toutes les données associées
    const facture = await Facture.findOne({ _id: factureId, entrepriseId })
      .populate({
        path: 'transaction',
        populate: {
          path: 'tiersId',
          model: 'Tiers'
        }
      })
      .populate('venteId');

    if (!facture) {
      return next(createError('Facture non trouvée', 404));
    }

    // Récupérer les lignes de la facture
    const lignes = await LigneTransaction.find({ transactionId: facture.transactionId })
      .populate('articleId');

    // Récupérer les remises
    const remises = await Remise.find({ transactionId: facture.transactionId });

    // Récupérer l'entreprise
    const entreprise = await mongoose.model('Entreprise').findById(entrepriseId);

    // Créer le PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Définir le chemin du fichier
    const fileName = `facture_${facture.numeroFacture.replace(/\//g, '_')}.pdf`;
    const filePath = path.join(__dirname, '../public/documents', fileName);
    
    // Créer un flux pour écrire le PDF sur le disque
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Ajouter le contenu au PDF (en-tête, infos client, tableau des articles, etc.)
    // ... (code pour générer le PDF)
    
    // Ajouter les informations de l'entreprise
    doc.fontSize(16).text(entreprise.nomEntreprise, { align: 'left' });
    doc.fontSize(10).text(`${entreprise.adresse}`, { align: 'left' });
    doc.text(`Tél: ${entreprise.telephone}`, { align: 'left' });
    doc.text(`Email: ${entreprise.email}`, { align: 'left' });
    doc.text(`Matricule fiscal: ${entreprise.matriculeFiscal}`, { align: 'left' });
    
    // Ajouter les informations du client
    doc.moveDown();
    doc.fontSize(14).text('Client', { align: 'right' });
    doc.fontSize(10).text(`${facture.transaction.tiersId.nom}`, { align: 'right' });
    doc.text(`${facture.transaction.tiersId.adresse}`, { align: 'right' });
    doc.text(`Tél: ${facture.transaction.tiersId.telephone || 'N/A'}`, { align: 'right' });
    
    // Ajouter les informations de la facture
    doc.moveDown();
    doc.fontSize(16).text(`FACTURE N° ${facture.numeroFacture}`, { align: 'center' });
    doc.fontSize(10).text(`Date: ${facture.dateFacture.toLocaleDateString()}`, { align: 'center' });
    
    // Tableau des articles
    doc.moveDown();
    let y = doc.y + 20;
    
    // En-têtes du tableau
    const tableTop = y;
    doc.fontSize(10);
    doc.text('Description', 50, y);
    doc.text('Quantité', 250, y, { width: 90, align: 'right' });
    doc.text('Prix unitaire', 340, y, { width: 90, align: 'right' });
    doc.text('Total HT', 430, y, { width: 90, align: 'right' });
    
    // Ligne de séparation
    y += 15;
    doc.moveTo(50, y).lineTo(520, y).stroke();
    y += 10;
    
    // Lignes d'articles
    for (const ligne of lignes) {
      doc.text(ligne.description, 50, y, { width: 200 });
      doc.text(ligne.quantite.toString(), 250, y, { width: 90, align: 'right' });
      doc.text(`${ligne.prixUnitaireHT.toFixed(2)} TND`, 340, y, { width: 90, align: 'right' });
      doc.text(`${ligne.montantHT.toFixed(2)} TND`, 430, y, { width: 90, align: 'right' });
      
      y += 20;
    }
    
    // Ligne de séparation
    doc.moveTo(50, y).lineTo(520, y).stroke();
    y += 10;
    
    // Résumé des montants
    doc.text('Total HT:', 340, y, { width: 90, align: 'right' });
    doc.text(`${facture.transaction.montantTotalHT.toFixed(2)} TND`, 430, y, { width: 90, align: 'right' });
    y += 15;
    
    // Remises
    const remiseGlobale = remises.find(r => r.estGlobale);
    if (remiseGlobale) {
      doc.text(`Remise (${remiseGlobale.type === 'POURCENTAGE' ? remiseGlobale.valeur + '%' : 'fixe'}):`, 340, y, { width: 90, align: 'right' });
      doc.text(`${remiseGlobale.montant.toFixed(2)} TND`, 430, y, { width: 90, align: 'right' });
      y += 15;
    }
    
    // TVA
    doc.text('TVA:', 340, y, { width: 90, align: 'right' });
    doc.text(`${facture.transaction.montantTaxes.toFixed(2)} TND`, 430, y, { width: 90, align: 'right' });
    y += 15;
    
    // Total TTC
    doc.fontSize(12).text('Total TTC:', 340, y, { width: 90, align: 'right' });
    doc.fontSize(12).text(`${facture.transaction.montantTotalTTC.toFixed(2)} TND`, 430, y, { width: 90, align: 'right' });
    
    // Finaliser le PDF
    doc.end();

    // Attendre que le fichier soit complètement écrit
    writeStream.on('finish', async () => {
      // Créer un document dans la base de données
      const document = new Document({
        type: 'FACTURE',
        referenceId: facture._id,
        nomFichier: fileName,
        urlFichier: `/documents/${fileName}`,
        dateCreation: new Date(),
        entrepriseId
      });
      
      await document.save();

      // Mettre à jour la facture avec l'URL du fichier
      facture.urlFichier = `/documents/${fileName}`;
      await facture.save();

      res.status(200).json({
        success: true,
        data: {
          facture,
          document,
          urlFichier: `/documents/${fileName}`
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

// Envoyer une facture par email
exports.envoyerFactureEmail = async (req, res, next) => {
  try {
    const { factureId } = req.params;
    const { email, message } = req.body;
    const entrepriseId = req.user.entrepriseId;

    // Récupérer la facture
    const facture = await Facture.findOne({ _id: factureId, entrepriseId })
      .populate({
        path: 'venteId',
        populate: {
          path: 'clientId',
          model: 'Tiers'
        }
      });

    if (!facture) {
      return next(createError('Facture non trouvée', 404));
    }

    // Vérifier que la facture a un fichier associé
    if (!facture.urlFichier) {
      return next(createError('Aucun fichier de facture disponible', 400));
    }

    // Récupérer les paramètres email de l'entreprise
    const entreprise = await mongoose.model('Entreprise').findById(entrepriseId);
    
    if (!entreprise.emailConfig || !entreprise.emailConfig.host) {
      return next(createError('Configuration email de l\'entreprise non définie', 400));
    }

    // Configurer le transporteur email
    const transporter = nodemailer.createTransport({
      host: entreprise.emailConfig.host,
      port: entreprise.emailConfig.port,
      secure: entreprise.emailConfig.secure,
      auth: {
        user: entreprise.emailConfig.user,
        pass: entreprise.emailConfig.password
      }
    });

    // Adresse email du destinataire
    const destinataire = email || facture.venteId.clientId.email;
    
    if (!destinataire) {
      return next(createError('Aucune adresse email spécifiée pour l\'envoi', 400));
    }

    // Préparer l'email
    const mailOptions = {
      from: `"${entreprise.nomEntreprise}" <${entreprise.emailConfig.user}>`,
      to: destinataire,
      subject: `Facture ${facture.numeroFacture}`,
      text: message || `Veuillez trouver ci-joint votre facture ${facture.numeroFacture}.`,
      attachments: [
        {
          filename: `Facture_${facture.numeroFacture.replace(/\//g, '_')}.pdf`,
          path: path.join(__dirname, '..', facture.urlFichier)
        }
      ]
    };


    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);

    // Mettre à jour la facture avec l'historique des envois
    if (!facture.historiqueEnvois) {
      facture.historiqueEnvois = [];
    }
    
    facture.historiqueEnvois.push({
      date: new Date(),
      email: destinataire,
      statut: 'ENVOYE',
      messageId: info.messageId
    });
    
    await facture.save();

    res.status(200).json({
      success: true,
      data: {
        facture,
        messageId: info.messageId,
        destinataire
      }
    });
  } catch (error) {
    next(error);
  }
};

// Récupérer les détails d'une vente
exports.getVenteById = async (req, res, next) => { 
  try {
    const { venteId } = req.params;
    const entrepriseId = req.user.entrepriseId;

    const vente = await Vente.findOne({ _id: venteId, entrepriseId })
      .populate({
        path: 'clientId',
        model: 'Tiers',
        select: 'nom prenom email telephone adresse solde'
      });

    if (!vente) {
      return next(createError('Vente non trouvée', 404));
    }

    const transaction = await Transaction.findById(vente.transactionId);
    
    if (!transaction) {
      return next(createError('Transaction associée non trouvée', 404));
    }

    // Récupérer les lignes de transaction
    const lignes = await LigneTransaction.find({ transactionId: vente.transactionId })
      .populate('articleId');

    // Récupérer les remises
    const remises = await Remise.find({ transactionId: vente.transactionId });

    // Récupérer les paiements
    const paiements = await Paiement.find({ transactionId: vente.transactionId });

    // Récupérer l'échéancier et les échéances si existants
    const echeancier = await Echeancier.findOne({ transactionId: vente.transactionId });
    const echeances = echeancier 
      ? await Echeance.find({ echeancier: echeancier._id }) 
      : [];

    // Récupérer la facture associée
    const facture = await Facture.findOne({ venteId: vente._id });

    // Récupérer les documents associés à la facture
    const documents = facture 
      ? await Document.find({ referenceId: facture._id }) 
      : [];

    res.status(200).json({
      success: true,
      data: {
        vente,
        transaction,
        lignes,
        remises,
        paiements,
        echeancier,
        echeances,
        facture,
        documents
      }
    });
  } catch (error) {
    next(error);
  }
};

// Récupérer toutes les ventes avec pagination
exports.getVentes = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, statut, dateDebut, dateFin, clientId, recherche } = req.query;
    const entrepriseId = req.user.entrepriseId;

    // Construire le filtre de recherche
    const filtre = { entrepriseId };

    if (statut) {
      filtre.statut = statut;
    }

    if (dateDebut || dateFin) {
      filtre.dateVente = {};
      if (dateDebut) filtre.dateVente.$gte = new Date(dateDebut);
      if (dateFin) filtre.dateVente.$lte = new Date(dateFin);
    }

    if (clientId) {
      filtre.clientId = clientId;
    }

    if (recherche) {
      // Recherche le client associé à la recherche
      const clients = await Tiers.find({
        entrepriseId,
        type: 'CLIENT',
        $or: [
          { nom: { $regex: recherche, $options: 'i' } },
          { prenom: { $regex: recherche, $options: 'i' } },
          { email: { $regex: recherche, $options: 'i' } }
        ]
      });
      
      const clientIds = clients.map(c => c._id);
      
      if (clientIds.length > 0) {
        filtre.$or = [{ clientId: { $in: clientIds } }];
      }
      
      // Recherche aussi dans les transactions
      const transactions = await Transaction.find({
        entrepriseId,
        type: 'VENTE',
        numeroTransaction: { $regex: recherche, $options: 'i' }
      });
      
      const transactionIds = transactions.map(t => t._id);
      
      if (transactionIds.length > 0) {
        if (!filtre.$or) filtre.$or = [];
        filtre.$or.push({ transactionId: { $in: transactionIds } });
      }
      
      // Si aucune correspondance trouvée, retourner une liste vide
      if (!filtre.$or || filtre.$or.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0,
            totalResults: 0
          }
        });
      }
    }

    // Compter le nombre total de ventes pour la pagination
    const count = await Vente.countDocuments(filtre);

    // Effectuer la requête paginée
    const ventes = await Vente.find(filtre)
      .populate('clientId', 'nom prenom email telephone')
      .populate('transactionId', 'numeroTransaction montantTotalHT montantTotalTTC')
      .sort({ dateVente: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Enrichir les résultats
    const ventesEnrichies = await Promise.all(ventes.map(async (vente) => {
      const facture = await Facture.findOne({ venteId: vente._id });
      return {
        ...vente._doc,
        facture: facture ? {
          _id: facture._id,
          numeroFacture: facture.numeroFacture,
          dateFacture: facture.dateFacture,
          urlFichier: facture.urlFichier
        } : null
      };
    }));

    res.status(200).json({
      success: true,
      count,
      data: ventesEnrichies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        totalResults: count
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mettre à jour le statut d'une vente (annuler, marquer comme payée, etc.)
exports.updateVenteStatus = async (req, res, next) => {
  try {
    const { venteId } = req.params;
    const { statut, motifAnnulation } = req.body;
    const entrepriseId = req.user.entrepriseId;

    // Vérifier que le statut est valide
    const statutsValides = ['VALIDEE', 'PAYEE', 'PARTIELLEMENT_PAYEE', 'ANNULEE'];
    if (!statutsValides.includes(statut)) {
      return next(createError('Statut invalide', 400));
    }

    // Trouver la vente
    const vente = await Vente.findOne({ _id: venteId, entrepriseId });
    if (!vente) {
      return next(createError('Vente non trouvée', 404));
    }

    // Vérifier les règles de changement de statut
    if (vente.statut === 'ANNULEE' && statut !== 'ANNULEE') {
      return next(createError('Impossible de modifier une vente annulée', 400));
    }

    if (statut === 'ANNULEE' && !motifAnnulation) {
      return next(createError('Motif d\'annulation requis', 400));
    }

    // Mettre à jour le statut
    vente.statut = statut;
    
    if (statut === 'ANNULEE') {
      vente.motifAnnulation = motifAnnulation;
      vente.dateAnnulation = new Date();
    }

    await vente.save();

    // Mettre à jour le statut de la transaction associée
    const transaction = await Transaction.findById(vente.transactionId);
    if (transaction) {
      transaction.statut = statut === 'ANNULEE' ? 'ANNULEE' : 'VALIDEE';
      await transaction.save();
    }

    // Mettre à jour le statut de la facture associée
    const facture = await Facture.findOne({ venteId: vente._id });
    if (facture) {
      facture.statut = statut;
      await facture.save();
    }

    res.status(200).json({
      success: true,
      data: {
        vente,
        transaction,
        facture
      }
    });
  } catch (error) {
    next(error);
  }
};

// Enregistrer un paiement pour une vente existante
exports.ajouterPaiement = async (req, res, next) => {
  try {
    const { venteId } = req.params;
    const { montant, type, datePaiement, reference, banque, notesPaiement } = req.body;
    const entrepriseId = req.user.entrepriseId;

    // Trouver la vente
    const vente = await Vente.findOne({ _id: venteId, entrepriseId });
    if (!vente) {
      return next(createError('Vente non trouvée', 404));
    }

    if (vente.statut === 'ANNULEE') {
      return next(createError('Impossible d\'ajouter un paiement à une vente annulée', 400));
    }

    if (vente.statut === 'PAYEE') {
      return next(createError('Cette vente est déjà entièrement payée', 400));
    }

    // Créer le nouveau paiement
    const nouveauPaiement = new Paiement({
      transactionId: vente.transactionId,
      type,
      montant,
      datePaiement: datePaiement || new Date(),
      reference,
      banque,
      statut: 'REÇU',
      notesPaiement,
      entrepriseId,
      creePar: req.user._id
    });

    await nouveauPaiement.save();

    // Mettre à jour le montant payé et le statut de la vente
    const transaction = await Transaction.findById(vente.transactionId);
    if (!transaction) {
      return next(createError('Transaction associée non trouvée', 404));
    }

    // Calculer le nouveau montant total payé
    const paiements = await Paiement.find({ transactionId: vente.transactionId });
    const montantTotalPaye = paiements.reduce((sum, p) => sum + p.montant, 0);
    
    vente.montantPaye = montantTotalPaye;
    vente.resteAPayer = transaction.montantTotalTTC - montantTotalPaye;

    // Mettre à jour le statut de la vente
    if (Math.abs(vente.resteAPayer) < 0.01) {
      vente.statut = 'PAYEE';
    } else if (vente.montantPaye > 0) {
      vente.statut = 'PARTIELLEMENT_PAYEE';
    }

    await vente.save();

    // Mettre à jour le statut de la facture associée
    const facture = await Facture.findOne({ venteId: vente._id });
    if (facture) {
      facture.statut = vente.statut;
      await facture.save();
    }

    res.status(200).json({
      success: true,
      data: {
        vente,
        paiement: nouveauPaiement,
        montantTotalPaye,
        resteAPayer: vente.resteAPayer
      }
    });
  } catch (error) {
    next(error);
  }
};

// Gérer les échéances en attente
exports.mettreAJourEcheance = async (req, res, next) => {
  try {
    const { echeanceId } = req.params;
    const { statut, dateEncaissement, reference, notes } = req.body;
    const entrepriseId = req.user.entrepriseId;

    // Vérifier que le statut est valide
    const statutsValides = ['A_RECEVOIR', 'REÇU', 'REJETÉ', 'REPORTÉ'];
    if (!statutsValides.includes(statut)) {
      return next(createError('Statut invalide', 400));
    }

    // Trouver l'échéance
    const echeance = await Echeance.findOne({ _id: echeanceId, entrepriseId });
    if (!echeance) {
      return next(createError('Échéance non trouvée', 404));
    }

    // Mettre à jour l'échéance
    echeance.statut = statut;
    if (dateEncaissement) {
      echeance.dateEncaissement = dateEncaissement;
    }
    if (reference) {
      echeance.referenceEncaissement = reference;
    }
    if (notes) {
      echeance.notes = notes;
    }

    await echeance.save();

    // Si l'échéance est reçue, créer un paiement correspondant
    if (statut === 'REÇU') {
      const nouveauPaiement = new Paiement({
        transactionId: echeance.transactionId,
        type: echeance.typePaiement,
        montant: echeance.montant,
        datePaiement: dateEncaissement || new Date(),
        reference: echeance.numeroReference,
        banque: echeance.banque,
        statut: 'REÇU',
        notesPaiement: `Échéance encaissée - ${notes || ''}`,
        entrepriseId,
        creePar: req.user._id
      });

      await nouveauPaiement.save();

      // Mettre à jour la vente
      const vente = await Vente.findOne({ transactionId: echeance.transactionId });
      if (vente) {
        // Calculer le nouveau montant total payé
        const paiements = await Paiement.find({ transactionId: vente.transactionId });
        const montantTotalPaye = paiements.reduce((sum, p) => sum + p.montant, 0);
        
        vente.montantPaye = montantTotalPaye;
        const transaction = await Transaction.findById(vente.transactionId);
        if (transaction) {
          vente.resteAPayer = transaction.montantTotalTTC - montantTotalPaye;
        }

        // Mettre à jour le statut de la vente
        if (Math.abs(vente.resteAPayer) < 0.01) {
          vente.statut = 'PAYEE';
        } else if (vente.montantPaye > 0) {
          vente.statut = 'PARTIELLEMENT_PAYEE';
        }

        await vente.save();

        // Mettre à jour la facture
        const facture = await Facture.findOne({ venteId: vente._id });
        if (facture) {
          facture.statut = vente.statut;
          await facture.save();
        }
      }
    }

    // Mettre à jour l'échéancier
    const echeancier = await Echeancier.findById(echeance.echeancier);
    if (echeancier) {
      // Vérifier si toutes les échéances sont payées
      const toutesEcheances = await Echeance.find({ echeancier: echeancier._id });
      const toutesPayees = toutesEcheances.every(e => e.statut === 'REÇU');
      
      if (toutesPayees) {
        echeancier.statut = 'TERMINE';
      } else {
        echeancier.statut = 'ACTIF';
      }
      
      await echeancier.save();
    }

    res.status(200).json({
      success: true,
      data: {
        echeance,
        echeancier
      }
    });
  } catch (error) {
    next(error);
  }
};

// Générer un reçu de paiement
exports.genererRecuPaiement = async (req, res, next) => {
  try {
    const { paiementId } = req.params;
    const entrepriseId = req.user.entrepriseId;
	

    // Récupérer le paiement
    const paiement = await Paiement.findOne({ _id: paiementId, entrepriseId });
    if (!paiement) {
      return next(createError('Paiement non trouvé', 404));
    }

    // Récupérer la transaction et la vente associées
    const transaction = await Transaction.findById(paiement.transactionId);
    if (!transaction) {
      return next(createError('Transaction associée non trouvée', 404));
    }

    const vente = await Vente.findOne({ transactionId: transaction._id });
    if (!vente) {
      return next(createError('Vente associée non trouvée', 404));
    }

    // Récupérer le client
    const client = await Tiers.findById(vente.clientId);
    if (!client) {
      return next(createError('Client non trouvé', 404));
    }

    // Récupérer l'entreprise
    const entreprise = await mongoose.model('Entreprise').findById(entrepriseId);

    // Créer le PDF du reçu
    const doc = new PDFDocument({ margin: 50 });
    
    // Définir le chemin du fichier
    const fileName = `recu_paiement_${paiement._id}.pdf`;
    const filePath = path.join(__dirname, '../public/documents', fileName);
    
    // Créer un flux pour écrire le PDF sur le disque
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Ajouter le contenu au PDF
    doc.fontSize(16).text(`REÇU DE PAIEMENT`, { align: 'center' });
    doc.moveDown();
    
    // Informations de l'entreprise
    doc.fontSize(12).text(entreprise.nomEntreprise, { align: 'left' });
    doc.fontSize(10).text(`${entreprise.adresse}`, { align: 'left' });
    doc.fontSize(10).text(`Tél: ${entreprise.telephone}`, { align: 'left' });
    
    // Informations du client
    doc.moveDown();
    doc.fontSize(12).text('Client:', { align: 'left' });
    doc.fontSize(10).text(`${client.nom} ${client.prenom || ''}`, { align: 'left' });
    doc.fontSize(10).text(`${client.adresse || 'N/A'}`, { align: 'left' });
    
    // Informations du paiement
    doc.moveDown();
    doc.fontSize(12).text('Détails du paiement:', { align: 'left' });
    doc.fontSize(10).text(`Date: ${paiement.datePaiement.toLocaleDateString()}`, { align: 'left' });
    doc.fontSize(10).text(`Montant: ${paiement.montant.toFixed(2)} TND`, { align: 'left' });
    doc.fontSize(10).text(`Mode de paiement: ${paiement.type}`, { align: 'left' });
    
    if (paiement.reference) {
      doc.fontSize(10).text(`Référence: ${paiement.reference}`, { align: 'left' });
    }
    
    if (paiement.banque) {
      doc.fontSize(10).text(`Banque: ${paiement.banque}`, { align: 'left' });
    }
    
    // Informations de la vente/facture
    const facture = await Facture.findOne({ venteId: vente._id });
    
    doc.moveDown();
    doc.fontSize(12).text('Référence vente:', { align: 'left' });
    doc.fontSize(10).text(`N° Transaction: ${transaction.numeroTransaction}`, { align: 'left' });
    
    if (facture) {
      doc.fontSize(10).text(`N° Facture: ${facture.numeroFacture}`, { align: 'left' });
    }
    
    doc.fontSize(10).text(`Montant total: ${transaction.montantTotalTTC.toFixed(2)} TND`, { align: 'left' });
    doc.fontSize(10).text(`Reste à payer: ${vente.resteAPayer.toFixed(2)} TND`, { align: 'left' });
    
    // Signature
    doc.moveDown(2);
    doc.fontSize(10).text('Signature:', { align: 'right' });
    doc.moveDown(3);
    doc.fontSize(10).text('_____________________', { align: 'right' });
    
    // Finaliser le PDF
    doc.end();

    // Attendre que le fichier soit complètement écrit
    writeStream.on('finish', async () => {
      // Créer un document dans la base de données
      const document = new Document({
        type: 'RECU_PAIEMENT',
        referenceId: paiement._id,
        nomFichier: fileName,
        urlFichier: `/documents/${fileName}`,
        dateCreation: new Date(),
        entrepriseId
      });
      
      await document.save();

      res.status(200).json({
        success: true,
        data: {
          paiement,
          document,
          urlFichier: `/documents/${fileName}`
        }
      });
    });
  } 
  
  catch (error) {
    next(error);
}};
  
    // Get payments for a sale
exports.getPaiementsVente = async (req, res, next) => {
  try {
    const { id: venteId } = req.params;
    const entrepriseId = req.user.entrepriseId;

    const vente = await Vente.findOne({ _id: venteId, entrepriseId });
    if (!vente) return next(createError('Vente non trouvée', 404));

    const paiements = await Paiement.find({ 
      transactionId: vente.transactionId 
    }).sort({ datePaiement: -1 });

    res.status(200).json({ 
      success: true, 
      data: paiements 
    });
  } catch (error) {
    next(error);
  }
};
 
 module.exports = {
  initierVente: exports.initierVente,
  ajouterLignesTransaction: exports.ajouterLignesTransaction,
  definirPaiement: exports.definirPaiement,
  creerEcheancier: exports.creerEcheancier,
  genererEcheancierAuto: exports.genererEcheancierAuto,
  validerVente: exports.validerVente,
  genererFacturePDF: exports.genererFacturePDF,
  envoyerFactureEmail: exports.envoyerFactureEmail,
  getVenteById: exports.getVenteById, // Renommer getVenteDetails en getVenteById
  getVentes: exports.getVentes,
  updateVenteStatus: exports.updateVenteStatus,
  ajouterPaiement: exports.ajouterPaiement,
  mettreAJourEcheance: exports.mettreAJourEcheance,
  genererRecuPaiement: exports.genererRecuPaiement,
  getPaiementsVente : exports.getPaiementsVente
};










