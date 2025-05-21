// services/venteService.js
import apiClient from '../utils/apiClient';

/**
 * Creates a sale in the backend by properly formatting data and creating 
 * the necessary Transaction, Vente, and Paiement records
 * 
 * @param {Object} venteData - The sale data collected from the form
 * @param {Object} userData - User and enterprise IDs (optional)
 * @returns {Promise} The API response
 */
export const createVente = async (venteData, userData = null) => {
  try {
    // Récupérer les données utilisateur si non fournies
    if (!userData) {
      const entrepriseId = localStorage.getItem('entrepriseId');
      const userId = localStorage.getItem('userId');
      if (!entrepriseId || !userId) {
        throw new Error('Informations utilisateur non disponibles');
      }
      userData = { entrepriseId, userId };
    }

    // Vérifier que les données utilisateur sont valides
    if (!userData.entrepriseId || !userData.userId) {
      throw new Error('Informations utilisateur manquantes. Veuillez vous reconnecter.');
    }

    // Vérifier que les données de vente sont valides
    if (!venteData) {
      throw new Error('Données de vente manquantes');
    }

    if (!venteData.client || !venteData.client._id) {
      throw new Error('Client non sélectionné');
    }

    if (!venteData.articles || !Array.isArray(venteData.articles) || venteData.articles.length === 0) {
      throw new Error('Aucun article sélectionné');
    }

    console.log('Articles avant traitement:', venteData.articles);

    // Préparer les données pour l'API
    const ventePayload = {
      clientId: venteData.client._id,
      typeDocument: venteData.typeDocument || 'FACTURE_PROFORMA',
      modePaiement: (venteData.modePaiement || 'ESPECES').toUpperCase(),
      notesInternes: venteData.notes || '',
      entrepriseId: userData.entrepriseId,
      userId: userData.userId,
      lignes: venteData.articles.map(article => {
        console.log('Traitement de l\'article:', article);
        
        const prixUnitaireHT = parseFloat(article.prixUnitaire);
        const quantite = parseFloat(article.quantite);
        const tauxTVA = parseFloat(article.tva || 19);
        const remise = parseFloat(article.remise || 0);
        
        // Calculer les montants
        const montantHT = prixUnitaireHT * quantite * (1 - remise/100);
        const montantTTC = montantHT * (1 + tauxTVA/100);

        // S'assurer que l'ID de l'article est une chaîne de caractères
        const articleId = String(article.article);

        const ligne = {
          articleId,
          type: 'PRODUIT',
          designation: article.designation,
          quantite,
          prixUnitaireHT,
          tauxTVA,
          remise,
          montantHT,
          montantTTC
        };

        console.log('Ligne créée:', ligne);
        return ligne;
      })
    };

    console.log('Envoi des données de vente:', JSON.stringify(ventePayload, null, 2));

    // Envoyer la requête à l'API
    const response = await apiClient.post('/api/ventes', ventePayload);
    return response.data;

  } catch (error) {
    console.error('Error creating sale:', error);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    throw error;
  }
};

/**
 * Helper function to prepare payment data based on payment method
 * @param {Object} venteData - The sale data collected from the form
 * @param {Number} montantTotalTTC - The total amount with taxes
 * @param {Object} userData - User and enterprise IDs
 * @returns {Array} Array of payment objects
 */
function preparePaiements(venteData, montantTotalTTC, userData) {
  const paiements = [];
  
  if (venteData.modePaiement === 'especes') {
    paiements.push({
      type: 'ESPECES',
      montant: montantTotalTTC,
      datePaiement: new Date().toISOString(),
      statut: 'ENCAISSE',
      dateStatut: new Date().toISOString(),
      entrepriseId: userData.entrepriseId,
      userId: userData.id,
      creePar: userData.id
    });
  } else if (['cheque', 'effet'].includes(venteData.modePaiement)) {
    const paiementType = venteData.modePaiement === 'cheque' ? 'CHEQUE' : 'EFFET';
    paiements.push({
      type: paiementType,
      montant: montantTotalTTC,
      datePaiement: new Date().toISOString(),
      reference: venteData.paiementDetails.reference,
      banque: venteData.paiementDetails.banque,
      dateEcheance: venteData.paiementDetails?.dateEcheance || new Date().toISOString(),
      statut: 'EN_ATTENTE',
      entrepriseId: userData.entrepriseId,
      userId: userData.id,
      creePar: userData.id
    });
  } 
  // Pour les modes de paiement avec échéancier, on ne crée pas de paiements ici
  // car ils seront créés automatiquement à partir des échéances dans le backend
  
  return paiements;
}

// Transformer un devis en bon de livraison
export const transformerEnBonLivraison = async (venteId) => {
  try {
    console.log('Appel de l\'API de transformation avec ID:', venteId);
    const response = await apiClient.post(`/api/ventes/${venteId}/transformer-en-bl`);
    console.log('Réponse de l\'API de transformation:', response.data);
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Erreur lors de la transformation');
    }

    // Retourner les données de la nouvelle vente
    return {
      success: true,
      data: {
        vente: response.data.data.vente,
        transaction: response.data.data.transaction
      }
    };
  } catch (error) {
    console.error('Erreur lors de la transformation:', error);
    throw new Error(error.response?.data?.error || 'Erreur lors de la transformation en bon de livraison');
  }
};

// Transformer un bon de livraison en facture
export const transformerEnFacture = async (venteId, modePaiement) => {
  try {
    const response = await apiClient.post(`/api/ventes/${venteId}/transformer-en-facture`, { modePaiement });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erreur lors de la transformation en facture');
  }
};

// Mettre à jour une vente existante
export const updateVente = async (id, venteData, userData = null) => {
  try {
    // Récupérer les données utilisateur si non fournies
    if (!userData) {
      const entrepriseId = localStorage.getItem('entrepriseId');
      const userId = localStorage.getItem('userId');
      if (!entrepriseId || !userId) {
        throw new Error('Informations utilisateur non disponibles');
      }
      userData = { entrepriseId, userId };
    }

    // Vérifier que les données utilisateur sont valides
    if (!userData.entrepriseId || !userData.userId) {
      throw new Error('Informations utilisateur manquantes. Veuillez vous reconnecter.');
    }

    // Préparer les données pour l'API
    const ventePayload = {
      ...venteData,
      entrepriseId: userData.entrepriseId,
      creePar: userData.userId
    };

    // Envoyer la requête à l'API
    const response = await apiClient.put(`/api/ventes/${id}`, ventePayload);
    return response.data;

  } catch (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
};

export const venteService = {
  getAllVentes: () => apiClient.get('/api/ventes'),
  getVenteById: (id) => apiClient.get(`/api/ventes/${id}`),
  createVente: (data) => apiClient.post('/api/ventes', data),
  updateVente: (id, data) => apiClient.put(`/api/ventes/${id}`, data),
  deleteVente: (id) => apiClient.delete(`/api/ventes/${id}`),
  validerVente: (id) => apiClient.post(`/api/ventes/${id}/valider`),
  transformerEnBonLivraison: (id) => apiClient.post(`/api/ventes/${id}/transformer-en-bl`),
  transformerEnFacture: (id, modePaiement) => 
    apiClient.post(`/api/ventes/${id}/transformer-en-facture`, { modePaiement }),
  transformerDevisEnBL: (devisIds) => 
    apiClient.post('/api/ventes/transformer-devis-en-bl', { devisIds }),
  transformerBLEnFactures: (blIds, modePaiement) => 
    apiClient.post('/api/ventes/transformer-bl-en-factures', { blIds, modePaiement }),
  genererDocumentComplementaire: (id, typeDocument, options = {}) => 
    apiClient.post(`/api/ventes/${id}/generer-document-complementaire`, { typeDocument, options })
};