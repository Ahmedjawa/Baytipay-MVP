// services/documentService.js
import apiClient from '../utils/apiClient';
import { formatDate, formatCurrency } from '../utils/formatters';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png'; // Assurez-vous d'avoir un logo dans vos assets

/**
 * Types de documents supportés
 */
export const DOCUMENT_TYPES = {
  FACTURE_TTC: 'FACTURE_TTC',
  FACTURE_HT: 'FACTURE_HT',
  BON_LIVRAISON: 'BON_LIVRAISON',
  FACTURE_PROFORMA: 'FACTURE_PROFORMA',
  AVOIR: 'AVOIR',
  FACTURE_RAS: 'FACTURE_RAS', // Retenue à la source
  FACTURE_FODEC: 'FACTURE_FODEC', // Fond de Développement de la Compétitivité
  RECU_FISCAL: 'RECU_FISCAL',
  FACTURE_ACOMPTE: 'FACTURE_ACOMPTE',
  BON_COMMANDE: 'BON_COMMANDE',
  ETAT_RECAPITULATIF: 'ETAT_RECAPITULATIF',
  ATTESTATION_RAS: 'ATTESTATION_RAS'
};

/**
 * Fonction utilitaire pour extraire les données importantes de manière sécurisée
 * quelle que soit la structure
 */
const extractSafeData = (venteData) => {
  // Créer un nouvel objet avec les données normalisées
  const safeData = { ...venteData };
  
  // Récupérer le client de manière sécurisée
  safeData.client = venteData.client || venteData.clientId || {};
  
  // Récupérer les montants de manière sécurisée
  const transaction = venteData.transaction || venteData.transactionId || {};
  
  safeData.montantTotalHT = venteData.montantTotalHT || transaction.montantTotalHT || 0;
  safeData.montantTaxes = venteData.montantTaxes || transaction.montantTaxes || 0;
  safeData.montantTotalTTC = venteData.montantTotalTTC || transaction.montantTotalTTC || 0;
  
  // Récupérer les lignes de manière sécurisée, priorité aux articles
  if (venteData.articles && Array.isArray(venteData.articles) && venteData.articles.length > 0) {
    // Articles depuis RecapitulatifStep
    console.log("Utilisation des articles de RecapitulatifStep:", venteData.articles);
    safeData.lignes = venteData.articles.map(article => ({
      designation: article.designation,
      reference: article.reference || article.id || "",
      quantite: article.quantite,
      prixUnitaireHT: article.prixUnitaire || article.prixUnitaireHT,
      montantHT: (article.prixUnitaire || article.prixUnitaireHT) * article.quantite,
      tauxTVA: article.tauxTVA || 19,
      montantTTC: article.montantTTC || (article.prixUnitaire * article.quantite),
      remise: article.remise || 0,
      unite: article.unite || "unité"
    }));
  } else {
    // Lignes depuis les autres sources
    safeData.lignes = venteData.lignes || 
                      (transaction.lignes ? 
                        (Array.isArray(transaction.lignes) ? transaction.lignes : []) : 
                        []);
  }
  
  // Si on a toujours pas de lignes mais qu'on a des montants, créer une ligne générique
  if (safeData.lignes.length === 0 && safeData.montantTotalHT > 0) {
    safeData.lignes = [{
      designation: "Article de la vente",
      reference: "Auto",
      quantite: 1,
      prixUnitaireHT: safeData.montantTotalHT,
      montantHT: safeData.montantTotalHT,
      tauxTVA: safeData.montantTotalHT > 0 ? (safeData.montantTaxes / safeData.montantTotalHT * 100).toFixed(2) : 0,
      montantTTC: safeData.montantTotalTTC,
      remise: 0,
      unite: "unité"
    }];
  }
  
  // Garder une référence à la transaction originale
  safeData.transaction = transaction;
  
  console.log("Données extraites sécurisées:", {
    client: safeData.client.nom || safeData.client.raisonSociale,
    lignes: safeData.lignes.length,
    montants: {
      ht: safeData.montantTotalHT,
      ttc: safeData.montantTotalTTC,
      taxes: safeData.montantTaxes
    }
  });
  
  return safeData;
};

//preview document
export const previewDocument = async (venteId, documentType, options = {}) => {
  try {
    // Récupérer les données de la vente
    const response = await apiClient.get(`/api/ventes/${venteId}`);
    const rawVenteData = response.data;
    
    console.log("Données de vente brutes reçues:", rawVenteData);
    
    // Extraction sécurisée des données importantes
    const venteData = extractSafeData(rawVenteData);
    
    console.log("Données normalisées pour le PDF:", {
      client: venteData.client,
      lignes: venteData.lignes.length,
      montants: {
        ht: venteData.montantTotalHT,
        taxes: venteData.montantTaxes,
        ttc: venteData.montantTotalTTC
      }
    });
    
    // Récupérer les informations de l'entreprise
    const entrepriseResponse = await apiClient.get('/api/entreprises/profile');
    const entrepriseData = entrepriseResponse.data;
    
    console.log("Données entreprise reçues:", entrepriseData);

    return await createPdf(venteData, entrepriseData, documentType, options);
  } catch (error) {
    console.error('Erreur lors de la prévisualisation:', error);
    throw error;
  }
};

/**
 * Génère un document commercial à partir d'une vente
 * 
 * @param {string} venteId - ID de la vente
 * @param {string} documentType - Type de document à générer (voir DOCUMENT_TYPES)
 * @param {Object} options - Options spécifiques au document (taux RAS, fodec, etc.)
 * @returns {Promise<Blob>} - Document PDF généré
 */
export const generateDocument = async (venteId, documentType, options = {}) => {
  try {
    // Vérifier si la vente est déjà enregistrée
    const venteResponse = await apiClient.get(`/api/ventes/${venteId}`);
    const venteData = venteResponse.data;
    
    // Si la vente n'est pas enregistrée, l'enregistrer automatiquement
    if (venteData && !venteData.estEnregistree) {
      console.log('La vente n\'est pas enregistrée. Enregistrement automatique...');
      try {
        await apiClient.put(`/api/ventes/${venteId}/enregistrer`);
        console.log('Vente enregistrée automatiquement avec succès');
      } catch (enregistrementError) {
        console.error('Erreur lors de l\'enregistrement automatique de la vente:', enregistrementError);
        // Continuer même si l'enregistrement a échoué pour permettre la génération du document
      }
    }
    
    // Récupérer les données de la vente (potentiellement mise à jour)
    const response = await apiClient.get(`/api/ventes/${venteId}`);
    const rawVenteData = response.data;
    
    // Extraction sécurisée des données importantes
    const safeVenteData = extractSafeData(rawVenteData);
    
    // Récupérer les informations de l'entreprise
    const entrepriseResponse = await apiClient.get('/api/entreprises/profile');
    const entrepriseData = entrepriseResponse.data;

    // Générer le document PDF
    const pdfBlob = await createPdf(safeVenteData, entrepriseData, documentType, options);
    
    // Sauvegarder l'enregistrement du document généré
    await saveDocumentRecord(venteId, documentType, options);
    
    return pdfBlob;
  } catch (error) {
    console.error('Erreur lors de la génération du document:', error);
    throw error;
  }
};

/**
 * Envoie le document par email
 * 
 * @param {string} venteId - ID de la vente
 * @param {string} documentType - Type de document
 * @param {Object} emailOptions - Options d'envoi email
 * @returns {Promise} - Résultat de l'envoi
 */
export const sendDocumentByEmail = async (venteId, documentType, emailOptions) => {
  try {
    const response = await apiClient.post(`/api/documents/${venteId}/send-email`, {
      documentType,
      ...emailOptions
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du document par email:', error);
    throw error;
  }
};

/**
 * Sauvegarde l'enregistrement du document généré
 * 
 * @param {string} venteId - ID de la vente
 * @param {string} documentType - Type de document
 * @param {Object} options - Options spécifiques au document
 * @returns {Promise} - Résultat de la sauvegarde
 */
const saveDocumentRecord = async (venteId, documentType, options) => {
  try {
    const response = await apiClient.post('/api/documents', {
      venteId,
      documentType,
      options,
      dateGeneration: new Date().toISOString()
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du document:', error);
    throw error;
  }
};

/**
 * Création du document PDF selon le type demandé
 * 
 * @param {Object} venteData - Données de la vente (déjà normalisées)
 * @param {Object} entrepriseData - Données de l'entreprise
 * @param {string} documentType - Type de document
 * @param {Object} options - Options spécifiques au document
 * @returns {Promise<Blob>} - Document PDF généré
 */
const createPdf = async (venteData, entrepriseData, documentType, options) => {
  // Création du document PDF
  const doc = new jsPDF();
  
  // Ajouter l'en-tête
  addHeader(doc, entrepriseData);
  
  // Ajouter les informations client et document
  addDocumentInfo(doc, venteData, documentType, options);
  
  // Ajouter le titre selon le type de document
  const titre = getDocumentTitle(documentType);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(titre, 105, 60, { align: 'center' });
  
  // Utiliser les lignes normalisées
  const lignes = venteData.lignes || [];
  
  // Ajouter le tableau des articles
  addArticlesTable(doc, lignes, documentType, options);
  
  // Ajouter le récapitulatif des totaux
  addTotalsSection(doc, venteData, documentType, options);
  
  // Ajouter les conditions de paiement et mentions légales
  addFooter(doc, venteData, documentType, options);
  
  // Retourner le document au format Blob
  return doc.output('blob');
};

/**
 * Ajoute l'en-tête du document
 */
const addHeader = (doc, entrepriseData) => {
  // Logo de l'entreprise
  try {
    doc.addImage(logo, 'PNG', 10, 10, 40, 20);
  } catch (e) {
    console.warn('Logo non disponible', e);
  }
  
  // Vérifier que entrepriseData existe
  if (!entrepriseData) {
    console.warn('Données entreprise non disponibles');
    return;
  }
  
  // Informations entreprise
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Vérifier chaque propriété avant de l'utiliser
  if (entrepriseData.nom || entrepriseData.raisonSociale) {
    doc.text(entrepriseData.nom || entrepriseData.raisonSociale, 60, 15);
  }
  
  if (entrepriseData.adresse) {
    doc.text(entrepriseData.adresse, 60, 20);
  }
  
  if (entrepriseData.formeJuridique && entrepriseData.numeroFiscal) {
    doc.text(`${entrepriseData.formeJuridique} - MF: ${entrepriseData.numeroFiscal}`, 60, 25);
  } else if (entrepriseData.numeroFiscal) {
    doc.text(`MF: ${entrepriseData.numeroFiscal}`, 60, 25);
  }
  
  if (entrepriseData.telephone) {
    doc.text(`Tél: ${entrepriseData.telephone}`, 60, 30);
  }
  
  if (entrepriseData.email) {
    doc.text(`Email: ${entrepriseData.email}`, 60, 35);
  }
};

/**
 * Ajoute les informations du client et du document
 */
const addDocumentInfo = (doc, venteData, documentType, options) => {
  // Informations client
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', 15, 50);
  doc.setFont('helvetica', 'normal');
  
  const client = venteData.client || {};
  const nomClient = client.raisonSociale || `${client.prenom || ''} ${client.nom || ''}`;
  
  doc.text(nomClient.trim() || 'Client non spécifié', 15, 55);
  doc.text(client.adresse || '', 15, 60);
  doc.text(`${client.codePostal || ''} ${client.ville || ''}, ${client.pays || ''}`.trim(), 15, 65);
  doc.text(`Tél: ${client.telephone || ''}`, 15, 70);
  doc.text(`M.F: ${client.matriculeFiscale || 'N/A'}`, 15, 75);
  
  // Informations document
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENT', 150, 50);
  doc.setFont('helvetica', 'normal');
  
  // Générer le numéro de document selon le type
  const numeroDocument = getDocumentNumber(documentType, venteData);
  const dateDocument = formatDate(new Date());
  
  doc.text(`N°: ${numeroDocument}`, 150, 55);
  doc.text(`Date: ${dateDocument}`, 150, 60);
  
  if (documentType === DOCUMENT_TYPES.FACTURE_PROFORMA) {
    doc.text(`Validité: 30 jours`, 150, 65);
  } else if (documentType !== DOCUMENT_TYPES.BON_LIVRAISON) {
    const dateEcheance = venteData.dateEcheance 
      ? formatDate(new Date(venteData.dateEcheance)) 
      : formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    doc.text(`Échéance: ${dateEcheance}`, 150, 65);
  }
  
  if (documentType === DOCUMENT_TYPES.BON_LIVRAISON) {
    doc.text(`Réf. Commande: ${options.refCommande || 'N/A'}`, 150, 70);
  }
};

/**
 * Retourne le titre du document selon son type
 */
const getDocumentTitle = (documentType) => {
  switch (documentType) {
    case DOCUMENT_TYPES.FACTURE_TTC:
      return 'FACTURE TTC';
    case DOCUMENT_TYPES.FACTURE_HT:
      return 'FACTURE HORS TAXES';
    case DOCUMENT_TYPES.BON_LIVRAISON:
      return 'BON DE LIVRAISON';
    case DOCUMENT_TYPES.FACTURE_PROFORMA:
      return 'FACTURE PROFORMA';
    case DOCUMENT_TYPES.AVOIR:
      return 'AVOIR';
    case DOCUMENT_TYPES.FACTURE_RAS:
      return 'FACTURE AVEC RETENUE À LA SOURCE';
    case DOCUMENT_TYPES.FACTURE_FODEC:
      return 'FACTURE AVEC FODEC';
    default:
      return 'DOCUMENT COMMERCIAL';
  }
};

/**
 * Génère le numéro de document en fonction du type
 */
const getDocumentNumber = (documentType, venteData) => {
  const date = new Date();
  const annee = date.getFullYear().toString();
  const mois = (date.getMonth() + 1).toString().padStart(2, '0');
  const jour = date.getDate().toString().padStart(2, '0');
  
  // Récupération de l'ID de transaction de manière sécurisée
  const transaction = venteData.transaction || {};
  const transactionId = transaction._id || venteData.id || Math.floor(Math.random() * 100000).toString();
  
  // S'assurer que l'on a bien une chaîne avant d'utiliser substr
  const idString = transactionId.toString();
  const lastDigits = idString.substr(-5);
  
  switch (documentType) {
    case DOCUMENT_TYPES.FACTURE_TTC:
    case DOCUMENT_TYPES.FACTURE_HT:
    case DOCUMENT_TYPES.FACTURE_RAS:
    case DOCUMENT_TYPES.FACTURE_FODEC:
      return `F-${annee}${mois}-${lastDigits}`;
    case DOCUMENT_TYPES.BON_LIVRAISON:
      return `BL-${annee}${mois}-${lastDigits}`;
    case DOCUMENT_TYPES.FACTURE_PROFORMA:
      return `PRO-${annee}${mois}-${lastDigits}`;
    case DOCUMENT_TYPES.AVOIR:
      return `AV-${annee}${mois}-${lastDigits}`;
    default:
      return `DOC-${annee}${mois}${jour}-${lastDigits}`;
  }
};

/**
 * Ajoute le tableau des articles au document
 */
const addArticlesTable = (doc, lignes = [], documentType, options) => {
  // Définir les colonnes en fonction du type de document
  let columns = [];
  
  switch (documentType) {
    case DOCUMENT_TYPES.FACTURE_HT:
      columns = [
        { header: 'Réf.', dataKey: 'reference' },
        { header: 'Désignation', dataKey: 'designation' },
        { header: 'Qté', dataKey: 'quantite' },
        { header: 'Prix U. HT', dataKey: 'prixUnitaireHT' },
        { header: 'Remise %', dataKey: 'remise' },
        { header: 'Total HT', dataKey: 'montantHT' }
      ];
      break;
    case DOCUMENT_TYPES.BON_LIVRAISON:
      columns = [
        { header: 'Réf.', dataKey: 'reference' },
        { header: 'Désignation', dataKey: 'designation' },
        { header: 'Qté', dataKey: 'quantite' },
        { header: 'Unité', dataKey: 'unite' }
      ];
      break;
    case DOCUMENT_TYPES.FACTURE_FODEC:
      columns = [
        { header: 'Réf.', dataKey: 'reference' },
        { header: 'Désignation', dataKey: 'designation' },
        { header: 'Qté', dataKey: 'quantite' },
        { header: 'Prix U. HT', dataKey: 'prixUnitaireHT' },
        { header: 'FODEC', dataKey: 'fodec' },
        { header: 'TVA %', dataKey: 'tauxTVA' },
        { header: 'Total TTC', dataKey: 'montantTTC' }
      ];
      break;
    case DOCUMENT_TYPES.FACTURE_RAS:
      columns = [
        { header: 'Réf.', dataKey: 'reference' },
        { header: 'Désignation', dataKey: 'designation' },
        { header: 'Qté', dataKey: 'quantite' },
        { header: 'Prix U. HT', dataKey: 'prixUnitaireHT' },
        { header: 'Total HT', dataKey: 'montantHT' },
        { header: 'TVA %', dataKey: 'tauxTVA' },
        { header: 'Total TTC', dataKey: 'montantTTC' }
      ];
      break;
    default: // FACTURE_TTC, FACTURE_PROFORMA, AVOIR
      columns = [
        { header: 'Réf.', dataKey: 'reference' },
        { header: 'Désignation', dataKey: 'designation' },
        { header: 'Qté', dataKey: 'quantite' },
        { header: 'Prix U. HT', dataKey: 'prixUnitaireHT' },
        { header: 'Remise %', dataKey: 'remise' },
        { header: 'TVA %', dataKey: 'tauxTVA' },
        { header: 'Total TTC', dataKey: 'montantTTC' }
      ];
  }
  
  // Transformer les lignes pour le tableau
  const rows = lignes.map(ligne => {
    const row = {
      reference: ligne.reference || 'N/A',
      designation: ligne.designation || 'Article sans désignation',
      quantite: ligne.quantite || 1,
      prixUnitaireHT: formatCurrency(ligne.prixUnitaireHT || 0),
      remise: ligne.remise ? `${ligne.remise}%` : '0%',
      montantHT: formatCurrency(ligne.montantHT || 0),
      tauxTVA: ligne.tauxTVA ? `${ligne.tauxTVA}%` : '0%',
      montantTTC: formatCurrency(ligne.montantTTC || 0),
      unite: ligne.unite || 'Unité'
    };
    
    // Ajouter FODEC si nécessaire
    if (documentType === DOCUMENT_TYPES.FACTURE_FODEC) {
      const tauxFodec = options.tauxFodec || 1; // Par défaut 1%
      const montantFodec = ((ligne.montantHT || 0) * tauxFodec / 100);
      row.fodec = `${tauxFodec}% (${formatCurrency(montantFodec)})`;
    }
    
    return row;
  });
  
  // Ajouter le tableau au document
  autoTable(doc, {
    startY: 80,
    head: [columns.map(col => col.header)],
    body: rows.map(row => columns.map(col => row[col.dataKey])),
    theme: 'grid',
    headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
    columnStyles: {
      designation: { cellWidth: 'auto' },
      quantite: { halign: 'center' },
      prixUnitaireHT: { halign: 'right' },
      remise: { halign: 'center' },
      tauxTVA: { halign: 'center' },
      montantHT: { halign: 'right' },
      montantTTC: { halign: 'right' },
      fodec: { halign: 'center' }
    },
    margin: { top: 80, right: 10, bottom: 10, left: 10 }
  });
};

/**
 * Ajoute la section des totaux
 */
const addTotalsSection = (doc, venteData, documentType, options) => {
  // Récupérer la position Y après le dernier tableau
  const finalY = doc.previousAutoTable ? doc.previousAutoTable.finalY + 10 : 150;
  
  // Pour certains types de documents, on n'affiche pas les totaux
  if (documentType === DOCUMENT_TYPES.BON_LIVRAISON) {
    return;
  }
  
  // Calculer les totaux de manière sécurisée
  const totalHT = venteData.montantTotalHT || 0;
  const totalTVA = venteData.montantTaxes || 0;
  const totalTTC = venteData.montantTotalTTC || 0;
  const remiseGlobale = venteData.remiseGlobale || 0;
  
  // Section des totaux
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Tableau des totaux
  const totalsTable = [
    ['Total HT', formatCurrency(totalHT)]
  ];
  
  // Ajouter la FODEC si nécessaire
  if (documentType === DOCUMENT_TYPES.FACTURE_FODEC) {
    const tauxFodec = options.tauxFodec || 1; // Par défaut 1%
    const montantFodec = totalHT * tauxFodec / 100;
    totalsTable.push(['FODEC ' + tauxFodec + '%', formatCurrency(montantFodec)]);
  }
  
  // Ajouter remise globale si applicable
  if (remiseGlobale > 0) {
    const montantRemise = totalHT * remiseGlobale / 100;
    totalsTable.push(['Remise globale ' + remiseGlobale + '%', '- ' + formatCurrency(montantRemise)]);
    // Recalculer le total HT après remise
    const totalHTApresRemise = totalHT - montantRemise;
    totalsTable.push(['Total HT après remise', formatCurrency(totalHTApresRemise)]);
  }
  
  // Ajouter TVA si applicable
  if (documentType !== DOCUMENT_TYPES.FACTURE_HT) {
    totalsTable.push(['TVA', formatCurrency(totalTVA)]);
  }
  
  // Ajouter RAS si applicable
  if (documentType === DOCUMENT_TYPES.FACTURE_RAS) {
    const tauxRAS = options.tauxRAS || 1.5; // Par défaut 1.5%
    const montantRAS = totalHT * tauxRAS / 100;
    totalsTable.push(['Retenue à la source ' + tauxRAS + '%', '- ' + formatCurrency(montantRAS)]);
    // Recalculer le total à payer après RAS
    const totalAPayer = totalTTC - montantRAS;
    totalsTable.push(['NET À PAYER', formatCurrency(totalAPayer)]);
  } else {
    // Ajouter le total TTC pour les autres types de documents
    totalsTable.push(['TOTAL TTC', formatCurrency(totalTTC)]);
  }
  
  // Ajouter le tableau à droite
  autoTable(doc, {
    startY: finalY,
    body: totalsTable,
    theme: 'plain',
    tableWidth: 80,
    margin: { left: 120 },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' }
    }
  });
  
  // Pour les factures avec retenue à la source, ajouter une note explicative
  if (documentType === DOCUMENT_TYPES.FACTURE_RAS) {
    const tauxRAS = options.tauxRAS || 1.5;
    const noteY = doc.previousAutoTable.finalY + 10;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`* Conformément à la législation tunisienne, une retenue à la source de ${tauxRAS}% a été appliquée.`, 14, noteY);
    doc.text(`Le montant de cette retenue doit être versé à l'administration fiscale par vos soins.`, 14, noteY + 5);
  }
  
  // Pour les factures avec FODEC, ajouter une note explicative
  if (documentType === DOCUMENT_TYPES.FACTURE_FODEC) {
    const tauxFodec = options.tauxFodec || 1;
    const noteY = doc.previousAutoTable.finalY + 10;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`* Le Fonds de Développement de la Compétitivité (FODEC) de ${tauxFodec}% est appliqué`, 14, noteY);
    doc.text(`conformément à la réglementation fiscale tunisienne.`, 14, noteY + 5);
  }
};

/**
 * Ajoute le pied de page au document
 */
const addFooter = (doc, venteData, documentType, options) => {
  const finalY = doc.previousAutoTable ? doc.previousAutoTable.finalY + 30 : 200;
  
  // Mode de paiement
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('MODE DE PAIEMENT', 14, finalY);
  doc.setFont('helvetica', 'normal');
  
  // Transformer le modePaiement du backend en texte lisible
  const modesPaiementTexte = {
    'ESPECES': 'Espèces',
    'especes': 'Espèces',
    'CHEQUE_UNIQUE': 'Chèque',
    'cheque': 'Chèque',
    'EFFET_UNIQUE': 'Effet',
    'effet': 'Effet',
    'CHEQUES_MULTIPLES': 'Chèques multiples',
    'cheques_multiples': 'Chèques multiples',
    'EFFETS_MULTIPLES': 'Effets multiples',
    'effets_multiples': 'Effets multiples',
    'PAIEMENT_MIXTE': 'Paiement mixte',
    'mixte': 'Paiement mixte'
  };
  
  const modePaiementTexte = modesPaiementTexte[venteData.modePaiement] || venteData.modePaiement || 'Non spécifié';
  doc.text(modePaiementTexte, 14, finalY + 5);
  
    // Si échéancier, ajouter les détails
  if (venteData.echeancier && Array.isArray(venteData.echeancier) && venteData.echeancier.length > 0) {
    doc.text('Échéancier de paiement:', 14, finalY + 10);
    
    const echeancierRows = venteData.echeancier.map((echeance, index) => [
      `Échéance ${index + 1}`,
      formatDate(new Date(echeance.date)),
      formatCurrency(echeance.montant)
    ]);
    
    autoTable(doc, {
      startY: finalY + 15,
      head: [['N°', 'Date', 'Montant']],
      body: echeancierRows,
      theme: 'grid',
      tableWidth: 100,
      margin: { left: 14 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35, halign: 'right' }
      }
    });
  }
  
  // Conditions de paiement
  let conditionsPaiementY = doc.previousAutoTable ? doc.previousAutoTable.finalY + 10 : finalY + 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDITIONS DE PAIEMENT', 14, conditionsPaiementY);
  doc.setFont('helvetica', 'normal');
  
  const conditionsPaiement = venteData.conditionsPaiement || 
    (documentType === DOCUMENT_TYPES.FACTURE_PROFORMA ? 
      'Validité de l\'offre: 30 jours' : 
      'Paiement à réception de facture. Pas d\'escompte pour règlement anticipé.');
  
  doc.text(conditionsPaiement, 14, conditionsPaiementY + 5);
  
  // Mentions légales
  const mentionsLegalesY = conditionsPaiementY + 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  
  if (documentType === DOCUMENT_TYPES.FACTURE_TTC || 
      documentType === DOCUMENT_TYPES.FACTURE_HT || 
      documentType === DOCUMENT_TYPES.FACTURE_RAS ||
      documentType === DOCUMENT_TYPES.FACTURE_FODEC) {
    doc.text('En cas de retard de paiement, des pénalités de retard au taux légal en vigueur seront appliquées.', 14, mentionsLegalesY);
    doc.text('Une indemnité forfaitaire pour frais de recouvrement de 40 DT sera due.', 14, mentionsLegalesY + 4);
  } else if (documentType === DOCUMENT_TYPES.BON_LIVRAISON) {
    doc.text('Marchandise non retournée considérée comme acceptée. Réserves à formuler à la livraison.', 14, mentionsLegalesY);
  } else if (documentType === DOCUMENT_TYPES.FACTURE_PROFORMA) {
    doc.text('Ce document n\'a pas valeur de facture et ne peut donner lieu à récupération de la TVA.', 14, mentionsLegalesY);
  } else if (documentType === DOCUMENT_TYPES.AVOIR) {
    doc.text('Cet avoir est à déduire de votre prochain règlement ou à valoir sur votre compte client.', 14, mentionsLegalesY);
  }
  
  // Signature et tampon
  const signatureY = mentionsLegalesY + 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNATURE ET TAMPON', 150, signatureY);
  
  // Ajouter un cadre pour la signature
  doc.rect(150, signatureY + 5, 40, 20);
  
  // Numéro de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} / ${pageCount}`, 195, 287, { align: 'right' });
  }
};

/**
 * Liste les documents générés pour une vente
 * 
 * @param {string} venteId - ID de la vente
 * @returns {Promise<Array>} - Liste des documents
 */
export const listDocuments = async (venteId) => {
  try {
    const response = await apiClient.get(`/api/documents/vente/${venteId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error);
    throw error;
  }
};

/**
 * Télécharge un document déjà généré
 * 
 * @param {string} documentId - ID du document
 * @returns {Promise<Blob>} - Document PDF
 */
export const downloadDocument = async (documentId) => {
  try {
    const response = await apiClient.get(`/api/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors du téléchargement du document:', error);
    throw error;
  }
};

/**
 * Supprime un document
 * 
 * @param {string} documentId - ID du document
 * @returns {Promise} - Résultat de la suppression
 */
export const deleteDocument = async (documentId) => {
  try {
    const response = await apiClient.delete(`/api/documents/${documentId}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error);
    throw error;
  }
};

/**
 * Sauvegarde les préférences de document pour un type donné
 * 
 * @param {string} documentType - Type de document
 * @param {Object} preferences - Préférences à sauvegarder
 * @returns {Promise} - Résultat de la sauvegarde
 */
export const saveDocumentPreferences = async (documentType, preferences) => {
  try {
    const response = await apiClient.post('/api/documents/preferences', {
      documentType,
      preferences
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des préférences:', error);
    throw error;
  }
};

/**
 * Récupère les préférences de document pour un type donné
 * 
 * @param {string} documentType - Type de document
 * @returns {Promise<Object>} - Préférences du document
 */
export const getDocumentPreferences = async (documentType) => {
  try {
    const response = await apiClient.get(`/api/documents/preferences/${documentType}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error);
    // Si les préférences n'existent pas, retourner un objet vide
    if (error.response && error.response.status === 404) {
      return {};
    }
    throw error;
  }
};

/**
 * Génère une URL de prévisualisation pour un document
 * 
 * @param {string} documentId - ID du document
 * @returns {string} - URL de prévisualisation
 */
export const getPreviewUrl = (documentId) => {
  return `${apiClient.defaults.baseURL}/api/documents/${documentId}/preview`;
};

/**
 * Marque un document comme envoyé
 * 
 * @param {string} documentId - ID du document
 * @returns {Promise} - Résultat de l'opération
 */
export const markDocumentAsSent = async (documentId) => {
  try {
    const response = await apiClient.post(`/api/documents/${documentId}/mark-sent`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors du marquage du document comme envoyé:', error);
    throw error;
  }
};

/**
 * Génère un document récapitulatif pour plusieurs ventes
 * 
 * @param {Array} venteIds - Liste des IDs de ventes à inclure
 * @param {string} documentType - Type de document à générer
 * @param {Object} options - Options pour le document
 * @returns {Promise<Blob>} - Document PDF généré
 */
export const generateSummaryDocument = async (venteIds, documentType, options = {}) => {
  try {
    // Récupérer toutes les ventes
    const ventesPromises = venteIds.map(id => apiClient.get(`/api/ventes/${id}`));
    const ventesResponses = await Promise.all(ventesPromises);
    const ventesData = ventesResponses.map(response => extractSafeData(response.data));
    
    // Récupérer les informations de l'entreprise
    const entrepriseResponse = await apiClient.get('/api/entreprises/profile');
    const entrepriseData = entrepriseResponse.data;

    // Générer le document PDF récapitulatif
    const doc = new jsPDF();
    
    // Ajouter l'en-tête
    addHeader(doc, entrepriseData);
    
    // Titre du document
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`RÉCAPITULATIF - ${getDocumentTitle(documentType)}`, 105, 50, { align: 'center' });
    
    // Date du récapitulatif
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le: ${formatDate(new Date())}`, 105, 60, { align: 'center' });
    
    // Tableau récapitulatif des ventes
    const rows = ventesData.map(vente => {
      const client = vente.client || {};
      const nomClient = client.raisonSociale || `${client.prenom || ''} ${client.nom || ''}`;
      const transactionDate = vente.dateVente || vente.dateCreation || new Date();
      
      return [
        getDocumentNumber(documentType, vente),
        formatDate(new Date(transactionDate)),
        nomClient.trim() || 'Client non spécifié',
        formatCurrency(vente.montantTotalHT || 0),
        formatCurrency(vente.montantTaxes || 0),
        formatCurrency(vente.montantTotalTTC || 0)
      ];
    });
    
    // Calcul des totaux
    const totalHT = ventesData.reduce((sum, vente) => sum + (vente.montantTotalHT || 0), 0);
    const totalTaxes = ventesData.reduce((sum, vente) => sum + (vente.montantTaxes || 0), 0);
    const totalTTC = ventesData.reduce((sum, vente) => sum + (vente.montantTotalTTC || 0), 0);
    
    // Ajouter le tableau
    autoTable(doc, {
      startY: 70,
      head: [['Numéro', 'Date', 'Client', 'Total HT', 'TVA', 'Total TTC']],
      body: rows,
      foot: [['TOTAL', '', '', formatCurrency(totalHT), formatCurrency(totalTaxes), formatCurrency(totalTTC)]],
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' }
      }
    });
    
    // Ajouter des notes si nécessaire
    if (options.notes) {
      const notesY = doc.previousAutoTable.finalY + 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES', 14, notesY);
      doc.setFont('helvetica', 'normal');
      doc.text(options.notes, 14, notesY + 5);
    }
    
    // Enregistrer l'opération
    await apiClient.post('/api/documents/summary', {
      venteIds,
      documentType,
      options,
      dateGeneration: new Date().toISOString()
    });
    
    // Retourner le document au format Blob
    return doc.output('blob');
  } catch (error) {
    console.error('Erreur lors de la génération du document récapitulatif:', error);
    throw error;
  }
};

/**
 * Génère un reçu fiscal pour une vente au comptant
 * 
 * @param {string} venteId - ID de la vente
 * @param {Object} options - Options spécifiques au document
 * @returns {Promise<Blob>} - Document PDF généré
 */
export const generateRecuFiscal = async (venteId, options = {}) => {
  try {
    // Récupérer les données de la vente
    const response = await apiClient.get(`/api/ventes/${venteId}`);
    const rawVenteData = response.data;
    
    // Extraction sécurisée des données importantes
    const venteData = extractSafeData(rawVenteData);
    
    // Récupérer les informations de l'entreprise
    const entrepriseResponse = await apiClient.get('/api/entreprises/profile');
    const entrepriseData = entrepriseResponse.data;

    // Génération du reçu fiscal
    const doc = new jsPDF();
    
    // Ajouter l'en-tête
    addHeader(doc, entrepriseData);
    
    // Titre et numéro du document
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REÇU FISCAL', 105, 60, { align: 'center' });
    
    // Générer le numéro du reçu
    const date = new Date();
    const annee = date.getFullYear().toString();
    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // S'assurer que l'on a bien une chaîne avant d'utiliser substr
    const transactionId = venteData.transaction?._id || venteData.id || Math.floor(Math.random() * 100000).toString();
    const idString = transactionId.toString();
    const lastDigits = idString.substr(-5);
    
    const numeroRecu = `RF-${annee}${mois}-${lastDigits}`;
    
    // Informations client et document
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ÉMIS À', 15, 75);
    doc.setFont('helvetica', 'normal');
    
    const client = venteData.client || {};
    const nomClient = client.raisonSociale || `${client.prenom || ''} ${client.nom || ''}`;
    
    doc.text(nomClient.trim() || 'Client non spécifié', 15, 80);
    doc.text(client.adresse || '', 15, 85);
    doc.text(`${client.codePostal || ''} ${client.ville || ''}, ${client.pays || ''}`.trim(), 15, 90);
    doc.text(`M.F: ${client.matriculeFiscale || 'N/A'}`, 15, 95);
    
    // Informations du reçu
    doc.setFont('helvetica', 'bold');
    doc.text('REÇU N°', 150, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(numeroRecu, 150, 80);
    doc.text(`Date: ${formatDate(new Date())}`, 150, 85);
    
    // Mode de paiement
    doc.setFont('helvetica', 'bold');
    doc.text('MODE DE PAIEMENT', 150, 95);
    doc.setFont('helvetica', 'normal');
    
    const modesPaiementTexte = {
      'ESPECES': 'Espèces',
      'especes': 'Espèces',
      'CHEQUE_UNIQUE': 'Chèque',
      'cheque': 'Chèque',
      'EFFET_UNIQUE': 'Effet',
      'effet': 'Effet',
      'CARTE_BANCAIRE': 'Carte bancaire',
      'cb': 'Carte bancaire',
      'VIREMENT': 'Virement bancaire',
      'virement': 'Virement bancaire'
    };
    
    const modePaiement = venteData.modePaiement || options.modePaiement || 'ESPECES';
    const modePaiementTexte = modesPaiementTexte[modePaiement] || modePaiement;
    doc.text(modePaiementTexte, 150, 100);
    
    // Si paiement par chèque, ajouter les détails
    if (modePaiement.includes('CHEQUE') || modePaiement.includes('cheque')) {
      const infoPaiement = options.infoPaiement || {};
      if (infoPaiement.banque || infoPaiement.numeroCheque) {
        doc.text(`Banque: ${infoPaiement.banque || 'N/A'}`, 150, 105);
        doc.text(`N° Chèque: ${infoPaiement.numeroCheque || 'N/A'}`, 150, 110);
      }
    }
    
    // Corps du reçu
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAILS DU PAIEMENT', 105, 120, { align: 'center' });
    
    // Montant en chiffres et en lettres
    const montantTTC = venteData.montantTotalTTC || 0;
    const montantEnLettres = options.montantEnLettres || 'Montant en lettres non spécifié';
    
    // Créer un encadré pour le montant
    doc.setDrawColor(0);
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 130, 170, 30, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Nous attestons avoir reçu la somme de:', 30, 140);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(montantTTC), 105, 150, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Soit en lettres: ${montantEnLettres}`, 30, 155);
    
    // En règlement de
    doc.setFontSize(11);
    doc.text('En règlement de:', 20, 175);
    doc.setFont('helvetica', 'bold');
    doc.text(`Facture N° ${options.numeroFacture || 'N/A'}`, 65, 175);
    
    // Mention légale spécifique aux reçus fiscaux
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Ce reçu est délivré en application des dispositions du code de la TVA et doit être conservé', 105, 200, { align: 'center' });
    doc.text('pendant une durée de 10 ans pour faire valoir ce que de droit.', 105, 205, { align: 'center' });
    
    // Ajout signature
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SIGNATURE ET CACHET', 160, 220);
    doc.rect(140, 225, 50, 40);
    
    // Sauvegarder l'enregistrement du document généré
    await saveDocumentRecord(venteId, DOCUMENT_TYPES_EXTENDED.RECU_FISCAL, options);
    
    // Retourner le document
    return doc.output('blob');
  } catch (error) {
    console.error('Erreur lors de la génération du reçu fiscal:', error);
    throw error;
  }
};

/**
 * Génère une facture d'acompte
 * 
 * @param {string} venteId - ID de la vente
 * @param {Object} options - Options spécifiques au document (pourcentage d'acompte)
 * @returns {Promise<Blob>} - Document PDF généré
 */
export const generateFactureAcompte = async (venteId, options = {}) => {
  try {
    // Récupérer les données de la vente
    const response = await apiClient.get(`/api/ventes/${venteId}`);
    const rawVenteData = response.data;
    
    // Extraction sécurisée des données importantes
    const venteData = extractSafeData(rawVenteData);
    
    // Récupérer les informations de l'entreprise
    const entrepriseResponse = await apiClient.get('/api/entreprises/profile');
    const entrepriseData = entrepriseResponse.data;

    // Création du document PDF
    const doc = new jsPDF();
    
    // Ajouter l'en-tête
    addHeader(doc, entrepriseData);
    
    // Informations client
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT', 15, 50);
    doc.setFont('helvetica', 'normal');
    
    const client = venteData.client || {};
    const nomClient = client.raisonSociale || `${client.prenom || ''} ${client.nom || ''}`;
    
    doc.text(nomClient.trim() || 'Client non spécifié', 15, 55);
    doc.text(client.adresse || '', 15, 60);
    doc.text(`${client.codePostal || ''} ${client.ville || ''}, ${client.pays || ''}`.trim(), 15, 65);
    doc.text(`Tél: ${client.telephone || ''}`, 15, 70);
    doc.text(`M.F: ${client.matriculeFiscale || 'N/A'}`, 15, 75);
    
    // Informations document
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENT', 150, 50);
    doc.setFont('helvetica', 'normal');
    
    // Générer le numéro du document
    const date = new Date();
    const annee = date.getFullYear().toString();
    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const transactionId = venteData.transaction?._id || venteData.id || Math.floor(Math.random() * 100000).toString();
    const idString = transactionId.toString();
    const lastDigits = idString.substr(-5);
    
    const numeroFacture = `FA-${annee}${mois}-${lastDigits}`;
    
    doc.text(`N°: ${numeroFacture}`, 150, 55);
    doc.text(`Date: ${formatDate(new Date())}`, 150, 60);
    
    const dateEcheance = options.dateEcheance || formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    doc.text(`Échéance: ${dateEcheance}`, 150, 65);
    
    if (options.refCommande) {
      doc.text(`Réf. Commande: ${options.refCommande}`, 150, 70);
    }
    
    // Titre du document
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE D\'ACOMPTE', 105, 90, { align: 'center' });
    
    // Corps du document - tableau simplifié
    const tauxAcompte = options.tauxAcompte || 30; // Par défaut 30%
    const totalHT = venteData.montantTotalHT || 0;
    const totalTVA = venteData.montantTaxes || 0;
    const totalTTC = venteData.montantTotalTTC || 0;
    
    const montantAcompteHT = totalHT * tauxAcompte / 100;
    const montantAcompteTVA = totalTVA * tauxAcompte / 100;
    const montantAcompteTTC = totalTTC * tauxAcompte / 100;
    
    // Tableau explicatif
    autoTable(doc, {
      startY: 100,
      head: [['Description', 'Montant HT', 'TVA', 'Montant TTC']],
      body: [
        [`Acompte de ${tauxAcompte}% sur commande ${options.refCommande || ''} du ${formatDate(options.dateCommande || new Date())}`, 
          formatCurrency(montantAcompteHT), 
          formatCurrency(montantAcompteTVA), 
          formatCurrency(montantAcompteTTC)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      },
      margin: { top: 100, right: 10, bottom: 10, left: 10 }
    });
    
    // Récapitulatif des montants
    const finalY = doc.previousAutoTable ? doc.previousAutoTable.finalY + 10 : 150;
    
    // Tableau des totaux
    const totalsTable = [
      ['Total HT', formatCurrency(montantAcompteHT)],
      ['TVA', formatCurrency(montantAcompteTVA)],
      ['TOTAL TTC', formatCurrency(montantAcompteTTC)]
    ];
    
    autoTable(doc, {
      startY: finalY,
      body: totalsTable,
      theme: 'plain',
      tableWidth: 80,
      margin: { left: 120 },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right', fontStyle: 'bold' }
      }
    });
    
    // Note explicative
    const noteY = doc.previousAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Cette facture concerne uniquement l\'acompte versé. Une facture définitive sera émise', 14, noteY);
    doc.text('lors de la livraison complète de la commande, avec déduction du montant de cet acompte.', 14, noteY + 5);
    
    // Conditions de paiement et mentions légales
    addFooter(doc, venteData, DOCUMENT_TYPES_EXTENDED.FACTURE_ACOMPTE, options);
    
    // Sauvegarder l'enregistrement du document généré
    await saveDocumentRecord(venteId, DOCUMENT_TYPES_EXTENDED.FACTURE_ACOMPTE, options);
    
    // Retourner le document
    return doc.output('blob');
  } catch (error) {
    console.error('Erreur lors de la génération de la facture d\'acompte:', error);
    throw error;
  }
};

/**
 * Génère un bon de commande
 * 
 * @param {Object} commandeData - Données de la commande (peut être différent d'une vente)
 * @param {Object} options - Options spécifiques au document
 * @returns {Promise<Blob>} - Document PDF généré
 */
export const generateBonCommande = async (commandeData, options = {}) => {
  try {
    // Récupérer les informations de l'entreprise
    const entrepriseResponse = await apiClient.get('/api/entreprises/profile');
    const entrepriseData = entrepriseResponse.data;

    // Création du document PDF
    const doc = new jsPDF();
    
    // Ajouter l'en-tête
    addHeader(doc, entrepriseData);
    
    // Titre du document
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('BON DE COMMANDE', 105, 40, { align: 'center' });
    
    // Informations fournisseur
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FOURNISSEUR', 15, 50);
    doc.setFont('helvetica', 'normal');
    
    const fournisseur = commandeData.fournisseur || {};
    doc.text(fournisseur.raisonSociale || 'Fournisseur non spécifié', 15, 55);
    doc.text(fournisseur.adresse || '', 15, 60);
    doc.text(`${fournisseur.codePostal || ''} ${fournisseur.ville || ''}, ${fournisseur.pays || ''}`.trim(), 15, 65);
    doc.text(`Tél: ${fournisseur.telephone || ''}`, 15, 70);
    doc.text(`M.F: ${fournisseur.matriculeFiscale || 'N/A'}`, 15, 75);
    
    // Informations document
    doc.setFont('helvetica', 'bold');
    doc.text('BON DE COMMANDE', 150, 50);
    doc.setFont('helvetica', 'normal');
    
    // Générer le numéro du bon de commande
    const date = new Date();
    const annee = date.getFullYear().toString();
    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
    const jour = date.getDate().toString().padStart(2, '0');
    
    // Génération d'un ID unique pour le bon de commande
    const commandeId = commandeData.id || Math.floor(Math.random() * 100000).toString();
    const idString = commandeId.toString();
    const lastDigits = idString.substr(-5);
    
    const numeroCommande = `BC-${annee}${mois}-${lastDigits}`;
    
    doc.text(`N°: ${numeroCommande}`, 150, 55);
    doc.text(`Date: ${formatDate(new Date())}`, 150, 60);
    doc.text(`Validité: ${options.validite || '30 jours'}`, 150, 65);
    
    // Personne de contact
    if (options.contact) {
      doc.text(`Contact: ${options.contact}`, 150, 70);
    }
    
    // Conditions de livraison
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDITIONS DE LIVRAISON', 15, 85);
    doc.setFont('helvetica', 'normal');
    
    const yStart = 90;
    doc.text(`Date de livraison souhaitée: ${options.dateLivraison || 'À préciser'}`, 15, yStart);
    doc.text(`Adresse de livraison: ${options.adresseLivraison || entrepriseData.adresse || 'Adresse du siège'}`, 15, yStart + 5);
    
    // Tableau des articles commandés
    const articles = commandeData.articles || [];
    
    const rows = articles.map(article => [
      article.reference || 'N/A',
      article.designation || 'Article sans désignation',
      article.quantite || 1,
      article.unite || 'Unité',
      formatCurrency(article.prixUnitaireHT || 0),
      formatCurrency((article.prixUnitaireHT || 0) * (article.quantite || 1))
    ]);
    
    // Calcul du total HT
    const totalHT = articles.reduce((sum, article) => 
      sum + (article.prixUnitaireHT || 0) * (article.quantite || 1), 0);
    
    // Ajouter le tableau
    autoTable(doc, {
      startY: 105,
      head: [['Référence', 'Désignation', 'Quantité', 'Unité', 'Prix unitaire HT', 'Total HT']],
      body: rows,
      foot: [['', '', '', '', 'TOTAL HT', formatCurrency(totalHT)]],
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 30, halign: 'right' }
      }
    });
    
    // Conditions générales d'achat
    const finalY = doc.previousAutoTable ? doc.previousAutoTable.finalY + 15 : 180;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONDITIONS GÉNÉRALES D\'ACHAT', 15, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    const conditions = [
      '1. La confirmation de cette commande implique l\'acceptation de nos conditions générales d\'achat.',
      '2. Toute livraison doit être accompagnée d\'un bon de livraison détaillé.',
      '3. Les factures doivent mentionner le numéro de ce bon de commande.',
      '4. Aucun changement de prix ne sera accepté sans accord écrit préalable.',
      '5. Nous nous réservons le droit de retourner toute marchandise non conforme à la commande.'
    ];
    
    let y = finalY + 5;
    conditions.forEach(condition => {
      doc.text(condition, 15, y);
      y += 4;
    });
    
    // Zone de signature
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SIGNATURE ET CACHET', 150, y + 10);
    doc.rect(140, y + 15, 50, 30);
    
    // Mention au fournisseur
    y += 50;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Veuillez nous retourner une copie de ce bon de commande signé pour confirmation.', 105, y, { align: 'center' });
    
    // Sauvegarder l'enregistrement du document généré (si une API est disponible)
    if (commandeData.id) {
      try {
        await apiClient.post('/api/commandes-fournisseurs/documents', {
          commandeId: commandeData.id,
          documentType: DOCUMENT_TYPES_EXTENDED.BON_COMMANDE,
          options,
          dateGeneration: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Impossible d\'enregistrer le document dans la base de données', e);
      }
    }
    
    // Retourner le document
    return doc.output('blob');
  } catch (error) {
    console.error('Erreur lors de la génération du bon de commande:', error);
    throw error;
  }
};

export const generateEtatRecapitulatifMensuel = async (month, year, options = {}) => {
  try {
    // Récupérer les ventes du mois
    const response = await apiClient.get(`/api/ventes?month=${month}&year=${year}`);
    const ventesData = response.data.map(vente => extractSafeData(vente));

    // Récupérer les infos entreprise
    const entrepriseResponse = await apiClient.get('/api/entreprises/profile');
    const entrepriseData = entrepriseResponse.data;

    const doc = new jsPDF();
    
    // En-tête
    addHeader(doc, entrepriseData);
    
    // Titre du document
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`ÉTAT RÉCAPITULATIF MENSUEL - ${month}/${year}`, 105, 50, { align: 'center' });

    // Tableau récapitulatif
    const rows = ventesData.map(vente => [
      formatDate(new Date(vente.dateVente)),
      vente.numeroFacture || getDocumentNumber(DOCUMENT_TYPES.FACTURE_TTC, vente),
      vente.client.raisonSociale || vente.client.nom,
      formatCurrency(vente.montantTotalHT),
      formatCurrency(vente.montantTaxes),
      formatCurrency(vente.montantTotalTTC)
    ]);

    // Totaux
    const totals = ventesData.reduce((acc, vente) => ({
      ht: acc.ht + (vente.montantTotalHT || 0),
      tva: acc.tva + (vente.montantTaxes || 0),
      ttc: acc.ttc + (vente.montantTotalTTC || 0)
    }), { ht: 0, tva: 0, ttc: 0 });

    autoTable(doc, {
      startY: 60,
      head: [['Date', 'N° Facture', 'Client', 'Total HT', 'TVA', 'Total TTC']],
      body: rows,
      foot: [
        ['TOTAL', '', '', 
         formatCurrency(totals.ht), 
         formatCurrency(totals.tva), 
         formatCurrency(totals.ttc)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [60, 60, 60], textColor: 255 },
      footStyles: { fillColor: [220, 220, 220], fontStyle: 'bold' },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    // Mentions légales
    const y = doc.previousAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.text(`Arrêté le présent état récapitulatif à ${formatDate(new Date())}`, 14, y);
    doc.text('Certifié conforme à la réglementation fiscale tunisienne', 14, y + 5);
    doc.text(`Nombre de factures : ${ventesData.length}`, 14, y + 10);

    return doc.output('blob');
  } catch (error) {
    console.error('Erreur génération état récapitulatif:', error);
    throw error;
  }
};

/**
 * Génère une attestation de retenue à la source
 * 
 * @param {string} venteId - ID de la vente avec RAS
 * @returns {Promise<Blob>} - PDF généré
 */
export const generateAttestationRAS = async (venteId) => {
  try {
    const response = await apiClient.get(`/api/ventes/${venteId}`);
    const venteData = extractSafeData(response.data);
    
    const entrepriseResponse = await apiClient.get('/api/entreprises/profile');
    const entrepriseData = entrepriseResponse.data;

    const doc = new jsPDF();
    
    // En-tête
    addHeader(doc, entrepriseData);
    
    // Titre
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ATTESTATION DE RETENUE À LA SOURCE', 105, 50, { align: 'center' });

    // Informations client
    const client = venteData.client || {};
    doc.setFontSize(11);
    doc.text(`Nom du client : ${client.raisonSociale || client.nom}`, 20, 60);
    doc.text(`Matricule fiscal : ${client.matriculeFiscale || 'Non disponible'}`, 20, 65);

    // Détails de la retenue
    const rasData = venteData.transaction?.retenueSource || {};
    const tauxRAS = rasData.taux || 1.5; // Taux par défaut 1.5%
    const montantRAS = rasData.montant || (venteData.montantTotalHT * tauxRAS / 100);

    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAILS DE LA RETENUE :', 20, 75);
    doc.setFont('helvetica', 'normal');
    
    const yStart = 80;
    doc.text(`- Numéro facture : ${getDocumentNumber(DOCUMENT_TYPES.FACTURE_RAS, venteData)}`, 20, yStart);
    doc.text(`- Date facture : ${formatDate(new Date(venteData.dateVente))}`, 20, yStart + 5);
    doc.text(`- Montant HT : ${formatCurrency(venteData.montantTotalHT)}`, 20, yStart + 10);
    doc.text(`- Taux RAS appliqué : ${tauxRAS}%`, 20, yStart + 15);
    doc.text(`- Montant retenu : ${formatCurrency(montantRAS)}`, 20, yStart + 20);

    // Mentions légales
    const yMentions = yStart + 30;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Attestation établie conformément aux dispositions du Code de l\'IRPP et', 20, yMentions);
    doc.text('de la législation fiscale tunisienne en vigueur.', 20, yMentions + 5);
    doc.text(`La retenue à la source de ${tauxRAS}% a été versée à l'administration fiscale`, 20, yMentions + 10);
    doc.text(`sous la référence de paiement : ${rasData.referencePaiement || 'Non spécifiée'}`, 20, yMentions + 15);

    // Signature
    const ySignature = yMentions + 25;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Pour certification,', 140, ySignature);
    doc.text('Le Gérant', 140, ySignature + 10);
    doc.rect(130, ySignature + 15, 50, 20); // Cadre signature

    return doc.output('blob');
  } catch (error) {
    console.error('Erreur génération attestation RAS:', error);
    throw error;
  }
};

/**
 * Fonction utilitaire pour enregistrer automatiquement une vente si nécessaire
 * Implémente la fonctionnalité décrite dans la mémoire système
 * 
 * @param {string} venteId - ID de la vente à vérifier/enregistrer
 * @returns {Promise<Object>} - Données de la vente (potentiellement mise à jour)
 */
const ensureVenteEnregistree = async (venteId) => {
  try {
    // Vérifier si la vente est déjà enregistrée
    const venteResponse = await apiClient.get(`/api/ventes/${venteId}`);
    const venteData = venteResponse.data;
    
    // Si la vente n'est pas enregistrée, l'enregistrer automatiquement
    if (venteData && !venteData.estEnregistree) {
      console.log(`[DOCUMENT] La vente ${venteId} n'est pas enregistrée. Enregistrement automatique...`);
      try {
        await apiClient.put(`/api/ventes/${venteId}/enregistrer`);
        console.log(`[DOCUMENT] Vente ${venteId} enregistrée automatiquement avec succès`);
        
        // Récupérer les données mises à jour après enregistrement
        const updatedResponse = await apiClient.get(`/api/ventes/${venteId}`);
        return updatedResponse.data;
      } catch (enregistrementError) {
        console.error('[DOCUMENT] Erreur lors de l\'enregistrement automatique de la vente:', enregistrementError);
        // Continuer avec les données originales
        return venteData;
      }
    }
    
    return venteData;
  } catch (error) {
    console.error('[DOCUMENT] Erreur lors de la vérification/enregistrement de la vente:', error);
    throw error;
  }
};


// Exporter par défaut l'ensemble des fonctions
export default {
  DOCUMENT_TYPES,
  previewDocument,
  generateDocument,
  sendDocumentByEmail,
  listDocuments,
  downloadDocument,
  deleteDocument,
  saveDocumentPreferences,
  getDocumentPreferences,
  getPreviewUrl,
  markDocumentAsSent,
  generateSummaryDocument,
  generateAttestationRAS,  
  generateRecuFiscal,
  generateFactureAcompte,
  generateBonCommande,
  saveDocumentRecord,
  ensureVenteEnregistree
};