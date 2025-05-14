// services/caisseService.js
import apiClient from '../utils/apiClient';

// Service pour la gestion de caisse
const caisseService = {
  // Vérifier le statut de la caisse
  getCaisseStatus: async () => {
    return await apiClient.get('api/caisse/status');
  },

  // Ouvrir une caisse
  ouvrirCaisse: async (data) => {
    return await apiClient.post('api/caisse/ouverture', {
      soldeInitial: data.soldeInitial
    });
  },

  // Fermer une caisse
  fermerCaisse: async (data) => {
    return await apiClient.post('api/caisse/fermeture', {
      soldeFinal: data.soldeFinal,
      commentaire: data.commentaire
    });
  },

  // Enregistrer une vente en espèces
  enregistrerVenteEspeces: async (venteData) => {
    return await apiClient.post('api/caisse/vente-especes', venteData);
  },

  // Récupérer le journal de caisse
  getJournalCaisse: async () => {
    return await apiClient.get('api/caisse/journal');
  },

  // Récupérer l'historique des caisses
  getHistoriqueCaisses: async (params) => {
    return await apiClient.get('api/caisse/historique', { params });
  },

  // Récupérer les transactions du jour
  getTransactionsJournee: async () => {
    return await apiClient.get('api/caisse/transactions');
  },

  // Générer un rapport de caisse
  genererRapportCaisse: async (caisseId = null) => {
    const url = caisseId ? `api/caisse/rapport/${caisseId}` : 'api/caisse/rapport-journalier';
    return await apiClient.get(url);
  },

  // Récupérer l'historique des ventes
  getHistoriqueVentes: async (params) => {
    return await apiClient.get('api/caisse/historique-ventes', { params });
  },

  // Ajouter un mouvement de caisse (encaissement ou décaissement)
  ajouterMouvement: async (data) => {
    return await apiClient.post('api/caisse/mouvement', data);
  }
};

export default caisseService;