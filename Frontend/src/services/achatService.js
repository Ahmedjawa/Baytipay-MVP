// achatService.js
import apiClient from '../utils/apiClient';

export const createAchat = async (achatData, userData) => {
  try {
    const date = new Date();
    const annee = date.getFullYear().toString().substr(-2);
    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
    const sequence = Math.floor(1000 + Math.random() * 9000);
    const numeroTransaction = `A-${annee}${mois}-${sequence}`;

    const modesPaiementBackend = {
      especes: 'ESPECES',
      cheque: 'CHEQUE_UNIQUE',
      effet: 'EFFET_UNIQUE',
      cheques_multiples: 'CHEQUES_MULTIPLES',
      effets_multiples: 'EFFETS_MULTIPLES',
      mixte: 'PAIEMENT_MIXTE'
    };

    const montantTotalHT = achatData.articles.reduce((total, article) => total + (parseFloat(article.montantHT) || 0), 0);
    const montantTaxes = achatData.articles.reduce((total, article) => total + (parseFloat(article.tva || 0) * parseFloat(article.montantHT || 0)) / 100, 0);
    const montantTotalTTC = achatData.totalTTC || (montantTotalHT + montantTaxes);

    const achatPayload = {
      fournisseurId: achatData.fournisseur._id,
      dateAchat: new Date().toISOString(),
      modePaiement: modesPaiementBackend[achatData.modePaiement],
      montantTotalHT,
      montantTaxes,
      montantTotalTTC,
      statut: 'VALIDEE',
      notesInternes: achatData.notes || '',
      entrepriseId: userData.entrepriseId,
      userId: userData.userId,
      creePar: userData.userId,
      paiements: preparePaiements(achatData, montantTotalTTC, userData),
      lignes: achatData.articles.map(article => {
        // Calculer les montants correctement
        const prixHT = parseFloat(article.prixUnitaire) || 0;
        const quantite = parseFloat(article.quantite) || 0;
        const remise = parseFloat(article.remise) || 0;
        const tauxTVA = parseFloat(article.tva) || 0;

        const montantHT = (prixHT * quantite) * (1 - remise / 100);
        const montantTTC = montantHT * (1 + tauxTVA / 100);

        return {
          produitId: article.article,
          designation: article.designation,
          quantite: quantite,
          prixUnitaireHT: prixHT,
          tauxTVA: tauxTVA,
          remise: remise,
          montantHT: montantHT, // ← Valeur calculée
          montantTTC: montantTTC // ← Valeur calculée
        };
      })
    };

    if (achatData.echeancier?.length > 0) {
      const montantTotal = achatData.echeancier.reduce((total, ech) => total + parseFloat(ech.montant), 0);
      achatPayload.echeancier = {
        montantTotal,
        nombreEcheances: achatData.echeancier.length,
        // Important: ajouter un identifiant unique pour l'achat
       // venteId: 'TEMP_ID', // Sera remplacé par l'ID réel après création de l'achat
        echeances: achatData.echeancier.map(ech => ({
          dateEcheance: ech.dateEcheance,
          montant: parseFloat(ech.montant),
          statut: 'A_PAYER',
          reference: ech.reference || `ECH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          banque: ech.banque || '',
          type: ech.type.toUpperCase(),
          notes: ech.notes || ''
        }))
      };
    }

    const achatResponse = await apiClient.post('api/achats', achatPayload);
    return achatResponse.data;
  } catch (error) {
    console.error('Erreur lors de la création de l\'achat:', error);
    throw error;
  }
};

function preparePaiements(achatData, montantTotalTTC, userData) {
  const paiements = [];
  if (achatData.modePaiement === 'especes') {
    paiements.push({
      type: 'ESPECES',
      montant: montantTotalTTC,
      datePaiement: new Date().toISOString(),
      statut: 'DECAISSE',
      entrepriseId: userData.entrepriseId,
      userId: userData.userId,
      creePar: userData.userId
    });
  } else if (['cheque', 'effet'].includes(achatData.modePaiement)) {
    const type = achatData.modePaiement === 'cheque' ? 'CHEQUE' : 'EFFET';
    paiements.push({
      type,
      montant: montantTotalTTC,
      datePaiement: new Date().toISOString(),
      reference: achatData.paiementDetails.reference,
      banque: achatData.paiementDetails.banque,
      dateEcheance: achatData.paiementDetails.dateEcheance,
      statut: 'EN_ATTENTE',
      entrepriseId: userData.entrepriseId,
      userId: userData.userId,
      creePar: userData.userId
    });
  }
  return paiements;
}