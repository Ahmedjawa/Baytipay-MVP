// services/venteService.js
import apiClient from '../utils/apiClient';

/**
 * Creates a sale in the backend by properly formatting data and creating 
 * the necessary Transaction, Vente, and Paiement records
 * 
 * @param {Object} venteData - The sale data collected from the form
 * @param {Object} userData - User and enterprise IDs
 * @returns {Promise} The API response
 */
export const createVente = async (venteData, userData) => {
  try {
    // 1. Generate unique transaction number
    const date = new Date();
    const annee = date.getFullYear().toString().substr(-2);
    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
    const sequence = Math.floor(1000 + Math.random() * 9000);
    const numeroTransaction = `V-${annee}${mois}-${sequence}`;
    
    // 2. Map frontend payment mode to backend enum
    const modesPaiementBackend = {
      especes: 'ESPECES',
      cheque: 'CHEQUE_UNIQUE',
      effet: 'EFFET_UNIQUE',
      cheques_multiples: 'CHEQUES_MULTIPLES',
      effets_multiples: 'EFFETS_MULTIPLES',
      mixte: 'PAIEMENT_MIXTE'
    };
    
    // 3. Calculate totals from articles
    const montantTotalHT = venteData.articles.reduce(
      (total, article) => total + (parseFloat(article.montantHT) || parseFloat(article.prixUnitaire) * parseFloat(article.quantite)), 0
    );
    const montantTaxes = venteData.articles.reduce(
      (total, article) => {
        const montantHT = parseFloat(article.montantHT) || parseFloat(article.prixUnitaire) * parseFloat(article.quantite);
        return total + (montantHT * parseFloat(article.tva || 0) / 100);
      }, 0
    );
    const montantTotalTTC = parseFloat(venteData.totalTTC) || (montantTotalHT + montantTaxes);
    
    // 4. Prepare sale data to send to vente endpoint directly
    const ventePayload = {
      clientId: venteData.client._id,
      dateVente: new Date().toISOString(),
      dateEcheance: venteData.paiementDetails?.dateEcheance || new Date().toISOString(),
      modePaiement: modesPaiementBackend[venteData.modePaiement],
      remiseGlobale: parseFloat(venteData.remise || 0),
      montantTotalHT,
      montantTotalTTC,
      montantTaxes,
      statut: 'VALIDEE',
      notesInternes: venteData.notes || '',
      
      // Include enterprise and user IDs in the payload
      entrepriseId: userData.entrepriseId,
      userId: userData.userId,
      
      // Add the required creePar field for validation
      creePar: userData.userId,
      
      // Pass payment information
      paiements: preparePaiements(venteData, montantTotalTTC, userData),
      
      // Pass ligne items
      lignes: venteData.articles.map(article => {
        const prixUnitaireHT = parseFloat(article.prixUnitaire);
        const quantite = parseFloat(article.quantite);
        const tauxTVA = parseFloat(article.tva || 0);
        const remise = parseFloat(article.remise || 0);
        
        // Calculate if not provided
        const montantHT = parseFloat(article.montantHT) || (prixUnitaireHT * quantite * (1 - remise/100));
        const montantTTC = parseFloat(article.montantTTC) || (montantHT * (1 + tauxTVA/100));
        
        return {
          produitId: article.article,
          designation: article.designation,
          quantite: quantite,
          prixUnitaireHT: prixUnitaireHT,
          tauxTVA: tauxTVA,
          remise: remise,
          montantHT: montantHT,
          montantTTC: montantTTC
        };
      })
    };
    
    // Ajouter l'échéancier si applicable
    if (['cheques_multiples', 'effets_multiples', 'mixte'].includes(venteData.modePaiement) && venteData.echeancier && venteData.echeancier.length > 0) {
      // Calculer le montant total des échéances
      const montantTotal = venteData.echeancier.reduce((total, echeance) => total + parseFloat(echeance.montant), 0);
      
      ventePayload.echeancier = {
        montantTotal: montantTotal,
        nombreEcheances: venteData.echeancier.length,
        echeances: venteData.echeancier.map(echeance => {
          // Déterminer le type en fonction du mode de paiement
          let type = 'CHEQUE';
          if (venteData.modePaiement === 'effets_multiples') {
            type = 'EFFET';
          } else if (venteData.modePaiement === 'mixte' && echeance.type) {
            type = echeance.type.toUpperCase();
          }
          
          return {
            dateEcheance: echeance.dateEcheance,
            montant: parseFloat(echeance.montant),
            statut: 'A_RECEVOIR',
            reference: echeance.reference || `ECH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            banque: echeance.banque || '',
            type: type,
            notes: echeance.notes || ''
          };
        })
      };
    }
    
    // Create the sale using the enhanced vente endpoint
    const venteResponse = await apiClient.post('api/ventes', ventePayload);
    
    return venteResponse.data;
  } catch (error) {
    console.error('Error creating sale:', error);
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
      userId: userData.userId,
      creePar: userData.userId
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
      userId: userData.userId,
      creePar: userData.userId
    });
  } 
  // Pour les modes de paiement avec échéancier, on ne crée pas de paiements ici
  // car ils seront créés automatiquement à partir des échéances dans le backend
  
  return paiements;
}