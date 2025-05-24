// services/venteService.js
import apiClient from '../utils/apiClient';
import axios from 'axios';
import { documentNumberingService } from './documentNumberingService';

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
        console.error('Informations utilisateur manquantes dans localStorage');
        throw new Error('Informations utilisateur non disponibles. Veuillez vous reconnecter.');
      }
      userData = { entrepriseId, userId };
    }

    // Vérifier que les données utilisateur sont valides
    if (!userData.entrepriseId || !userData.userId) {
      console.error('Données utilisateur invalides:', userData);
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
	
	const documentTypeMap = {
  'FACTURE_TTC': 'FACTURE',
  'FACTURE_HT': 'FACTURE',
  'BON_LIVRAISON': 'BON_LIVRAISON',
  'FACTURE_PROFORMA': 'DEVIS',
  'AVOIR': 'AVOIR'
};

const typeDocumentBack = documentTypeMap[venteData.typeDocument] || 'FACTURE';
	
	const modePaiementMap = {
  espece: 'ESPECES',
  especes: 'ESPECES',
  cheque: 'CHEQUE_UNIQUE',
  effet: 'EFFET_UNIQUE',
  cheques_multiples: 'CHEQUES_MULTIPLES',
  effets_multiples: 'EFFETS_MULTIPLES',
  mixte: 'PAIEMENT_MIXTE'
};

const modePaiementBack = modePaiementMap[venteData.modePaiement?.toLowerCase()] || 'ESPECES';

    // Préparer les données pour l'API
    const ventePayload = {
      clientId: venteData.client._id,
      typeDocument: typeDocumentBack,
      modePaiement: modePaiementBack,
      notesInternes: venteData.notes || '',
      entrepriseId: userData.entrepriseId,
      userId: userData.userId,
      lignes: venteData.articles.map(article => {
        console.log('Traitement de l\'article:', article);
        
        const prixUnitaireHT = parseFloat(article.prixUnitaire);
        const quantite = parseFloat(article.quantite);
        const tauxTVA = parseFloat(article.tva || article.tauxTVA || 19);
        const remise = parseFloat(article.remise || 0);
        
        // Calculer les montants
        const montantHT = prixUnitaireHT * quantite * (1 - remise/100);
        const montantTTC = montantHT * (1 + tauxTVA/100);

        // Déterminer l'articleId et le type
        let articleId = null;
        let type = 'SERVICE'; // Par défaut SERVICE
        
        // Si articleId est présent sous différentes formes possibles
        if (article.articleId) {
          articleId = typeof article.articleId === 'object' ? article.articleId._id : article.articleId;
        } else if (article.article) {
          articleId = typeof article.article === 'object' ? article.article._id : article.article;
        } else if (article.articleData && article.articleData._id) {
          articleId = article.articleData._id;
        }

        // Déterminer le type de manière stricte
        if (article.articleData && article.articleData.type) {
          // Si on a un type défini dans articleData, on l'utilise
          type = article.articleData.type === 'PRODUIT' ? 'PRODUIT' : 'SERVICE';
        } else if (article.type) {
          // Si on a un type défini dans l'article, on l'utilise
          type = article.type === 'PRODUIT' ? 'PRODUIT' : 'SERVICE';
        }

        // Si c'est un PRODUIT mais sans articleId, le transformer en SERVICE
        if (type === 'PRODUIT' && !articleId) {
          console.warn('Article de type PRODUIT sans articleId détecté, changement en SERVICE:', article);
          type = 'SERVICE';
        }

        const ligne = {
          articleId,
          type,
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
    
    // Vérifier si la requête a réussi
    if (response && response.data && response.data.success) {
      console.log('Vente créée avec succès:', response.data);
    return response.data;
    } else {
      console.error('Erreur dans la réponse API:', response.data);
      throw new Error(response.data.message || 'Erreur lors de la création de la vente');
    }

  } catch (error) {
    console.error('Error creating sale:', error);
    
    // Vérification spécifique pour les erreurs d'authentification
    if (error.response && error.response.status === 401) {
      console.error("Erreur d'authentification 401:", error.response.data);
      
      // Si l'erreur est une erreur d'authentification et contient un message sur le token expiré, 
      // on ne déclenche pas la redirection ici (l'intercepteur global le fera déjà)
      if (error.response.data.message && error.response.data.message.includes('token')) {
        throw new Error('Session expirée. Redirection en cours...');
      }
    }
    
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
      throw new Error(error.response.data.message || 'Erreur serveur lors de la création de la vente');
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

    const documentTypeMap = {
      'FACTURE_TTC': 'FACTURE',
      'FACTURE_HT': 'FACTURE',
      'FACTURE_PROFORMA': 'DEVIS',
      'BON_LIVRAISON': 'BON_LIVRAISON',
      'AVOIR': 'AVOIR'
    };

    const typeDocumentBack = documentTypeMap[venteData.typeDocument] || 'FACTURE';

    // Transformation articles → lignes
    const lignes = (venteData.articles || []).map(article => {
      const prixUnitaireHT = parseFloat(article.prixUnitaireHT || article.prixUnitaire || 0);
      const quantite = parseFloat(article.quantite || 1);
      const tauxTVA = parseFloat(article.tva || article.tauxTVA || 19);
      const remise = parseFloat(article.remise || 0);
      const montantHT = prixUnitaireHT * quantite * (1 - remise / 100);
      const montantTTC = montantHT * (1 + tauxTVA / 100);

      const articleId = typeof article.articleId === 'object' ? article.articleId._id : article.articleId;

      return {
        articleId,
        type: article.type || 'SERVICE',
        designation: article.designation || 'Article',
        quantite,
        prixUnitaireHT,
        tauxTVA,
        remise,
        montantHT,
        montantTTC
      };
    });

    // Construction du payload final
    const ventePayload = {
      ...venteData,
      typeDocument: typeDocumentBack,
      entrepriseId: userData.entrepriseId,
      creePar: userData.userId,
      lignes
    };

    // Supprimer "articles" du payload si encore présent
    delete ventePayload.articles;

    // Envoi
    const response = await apiClient.put(`/api/ventes/${id}`, ventePayload);
    return response.data;

  } catch (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const venteService = {
  getAllVentes: () => apiClient.get('/api/ventes'),
  getVenteById: (id) => apiClient.get(`/api/ventes/${id}`),
  async createVente(venteData) {
    try {
      // Obtenir le prochain numéro de document
      const { formattedNumber } = await documentNumberingService.getNextDocumentNumber(venteData.typeDocument);
      
      // Ajouter le numéro de document aux données
      const venteWithNumber = {
        ...venteData,
        numeroDocument: formattedNumber
      };

      const response = await axios.post(`${API_URL}/ventes`, venteWithNumber);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de la vente:', error);
      throw error;
    }
  },
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