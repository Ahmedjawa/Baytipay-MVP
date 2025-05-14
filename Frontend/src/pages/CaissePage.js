// components/CaissePage.jsx
import React, { useState, useEffect } from 'react';
import caisseService from '../services/caisseService';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button, Divider,
  TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Snackbar, Alert, InputAdornment, Tabs, Tab, AppBar,
  Tooltip, Badge, Chip, MenuItem, Select, FormControl, InputLabel,
  ListItem, List, ListItemText, ListItemSecondaryAction, FormControlLabel,
  Radio, RadioGroup, Container, FormLabel
} from '@mui/material';

import {
  Add, Remove, Delete, Search, ShoppingCart, PointOfSale, Print,
  Receipt, MonetizationOn, CreditCard, Money, CheckCircle, Cancel,
  EventNote, AccountBalance, CalculateOutlined, SaveAlt, Close, 
  Inventory2, KeyboardArrowUp, KeyboardArrowDown, Cached, Payment,
  LocalAtm, History, AssessmentOutlined, PersonOutline
} from '@mui/icons-material';

import apiClient from '../utils/apiClient';
import { createVente } from '../services/venteService';
import { Tune, FilterList, GetApp, Archive, DateRange } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import frLocale from 'date-fns/locale/fr';
import { parseISO, format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';


function CaissePage() {
  // États pour la gestion des données
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentTab, setCurrentTab] = useState(0);
  const [historyTab, setHistoryTab] = useState('ventes');
  const [historyFilter, setHistoryFilter] = useState({
    dateDebut: startOfDay(new Date()),
    dateFin: endOfDay(new Date()),
    modePaiement: 'tous',
    minAmount: '',
    maxAmount: '',
    clientName: ''
  });
  const [historiqueVentes, setHistoriqueVentes] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historiqueFiltre, setHistoriqueFiltre] = useState([]);
  const [dialogFilterOpen, setDialogFilterOpen] = useState(false);
  
  // État pour le statut de la caisse
  const [caisseStatus, setCaisseStatus] = useState({
    isOpen: false,
    soldeInitial: 0,
    soldeCourant: 0,
    ouvertureCaisse: null,
    fermetureCaisse: null
  });
  
  // État pour la vente en cours
  const [venteEnCours, setVenteEnCours] = useState({
    client: null,
    articles: [],
    sousTotal: 0,
    remise: 0,
    tva: 0,
    totalTTC: 0,
    modePaiement: 'ESPECES',
    paiementDetails: {
      montantRecu: 0,
      monnaie: 0,
      reference: ''
    }
  });
  
  // État pour la réconciliation de caisse
  const [reconciliation, setReconciliation] = useState({
    montantEspeces: 0,
    montantCheques: 0,
    montantCartes: 0,
    ecart: 0,
    commentaire: ''
  });
  
  // État pour les dialogues
  const [dialogues, setDialogues] = useState({
    ouvertureCaisse: false,
    fermetureCaisse: false,
    paiement: false,
    articleDetails: false,
    clientSelection: false,
    mouvement: false
  });
  
  // État pour l'article sélectionné
  const [selectedArticle, setSelectedArticle] = useState({
    article: null,
    quantite: 1,
    prixUnitaire: 0,
    remise: 0,
    tva: 19,
    total: 0
  });

  // État pour un nouveau mouvement de caisse
  const [nouveauMouvement, setNouveauMouvement] = useState({
    type: 'ENCAISSEMENT',
    montant: 0,
    modePaiement: 'ESPECES',
    description: '',
    reference: ''
  });
  
  // États pour les journaux
  const [journalCaisse, setJournalCaisse] = useState([]);
  const [historiqueCaisses, setHistoriqueCaisses] = useState([]);
  const [transactionsJournee, setTransactionsJournee] = useState([]);
  
  // Catégories produits courantes
  const [categories, setCategories] = useState([
    { id: 1, nom: 'Tous' },
    { id: 2, nom: 'Populaires' },
    { id: 3, nom: 'Promotions' },
    // Ajoutez vos catégories ici
  ]);
  
  const handleClientComptoir = async () => {
  try {
    // Rechercher le client "Client comptoir"
    const response = await apiClient.get('api/Tiers', {
      params: { q: 'Client comptoir' }
    });
    
    let client = response.data[0];
    
    // Si non trouvé, le créer
    if (!client) {
      const nouveauClient = {
        nom: 'Client comptoir',
        type: 'CLIENT',
        matriculeFiscal: '0000000XXX', // Valeur factice pour validation
        adresse: 'Non spécifié',
        telephone: '00000000',
        email: 'comptoir@example.com'
      };
      
      const createResponse = await apiClient.post('api/Tiers', nouveauClient);
      client = createResponse.data;
    }
	    // Mettre à jour la vente avec ce client
    setVenteEnCours(prev => ({
      ...prev,
      client
    }));
    
    setDialogues({ ...dialogues, clientSelection: false });
  } catch (error) {
    console.error('Erreur gestion client comptoir:', error);
    setSnackbar({
      open: true,
      message: 'Erreur lors de la gestion du client comptoir',
      severity: 'error'
    });
  }
};
  
  const [selectedCategory, setSelectedCategory] = useState(1);
  
  // Récupération initiale des données
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Charger les articles et les clients depuis votre API
        const articlesResponse = await apiClient.get('api/articles');
        const clientsResponse = await apiClient.get('api/Tiers');
        
        setArticles(articlesResponse.data);
        setClients(clientsResponse.data);
        
        // Charger le statut de la caisse
        const caisseStatusResponse = await caisseService.getCaisseStatus();
        const caisse = caisseStatusResponse.data;
        
        setCaisseStatus({
          isOpen: caisse.isOpen,
          soldeInitial: caisse.soldeInitial,
          soldeCourant: caisse.soldeCourant,
          ouvertureCaisse: caisse.ouvertureCaisse,
          fermetureCaisse: caisse.fermetureCaisse
        });
        
        if (caisse.isOpen) {
          // Si la caisse est ouverte, charger les données associées
          loadJournalCaisse();
          loadTransactionsJournee();
          loadHistoriqueVentes();
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setSnackbar({
          open: true,
          message: 'Erreur lors du chargement des données: ' + (error.response?.data?.message || error.message),
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Calcul des totaux quand le panier change
  useEffect(() => {
    calculateTotals();
  }, [venteEnCours.articles, venteEnCours.remise]);
  
  // Charger le journal de caisse
  const loadJournalCaisse = async () => {
    try {
      const response = await caisseService.getJournalCaisse();
      setJournalCaisse(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement du journal de caisse:', error);
    }
  };
  
  // Charger les transactions du jour
  const loadTransactionsJournee = async () => {
    try {
      const response = await caisseService.getTransactionsJournee();
      setTransactionsJournee(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des transactions du jour:', error);
    }
  };
  
  // Charger l'historique des ventes
  const loadHistoriqueVentes = async () => {
    try {
      setLoadingHistory(true);
      
      const params = {
        dateDebut: format(historyFilter.dateDebut, 'yyyy-MM-dd'),
        dateFin: format(historyFilter.dateFin, 'yyyy-MM-dd'),
        modePaiement: historyFilter.modePaiement !== 'tous' ? historyFilter.modePaiement : undefined,
        minAmount: historyFilter.minAmount || undefined,
        maxAmount: historyFilter.maxAmount || undefined,
        clientName: historyFilter.clientName || undefined
      };
      
      const response = await caisseService.getHistoriqueVentes(params);
      setHistoriqueVentes(response.data);
      setHistoriqueFiltre(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique des ventes:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement de l\'historique',
        severity: 'error'
      });
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Charger l'historique des caisses
  const loadHistoriqueCaisses = async () => {
    try {
      const response = await caisseService.getHistoriqueCaisses();
      setHistoriqueCaisses(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique des caisses:', error);
    }
  };
  
  // Calcul des totaux
  const calculateTotals = () => {
    const articles = venteEnCours.articles || [];
    
    // Sous-total
    const sousTotal = articles.reduce((sum, item) => 
      sum + (item.prixUnitaire * item.quantite), 0);
    
    // Remise globale
    const remiseGlobale = sousTotal * (venteEnCours.remise / 100);
    
    // Total HT après remise
    const totalHT = sousTotal - remiseGlobale;
    
    // TVA
    const totalTVA = articles.reduce((sum, item) => {
      const montantHT = item.prixUnitaire * item.quantite * (1 - item.remise / 100);
      return sum + (montantHT * (item.tva / 100));
    }, 0);
    
    // Total TTC
    const totalTTC = totalHT + totalTVA;
    
    // Mise à jour du state
    setVenteEnCours(prev => ({
      ...prev,
      sousTotal,
      tva: totalTVA,
      totalTTC
    }));
  };
  
  // Filtrage des articles par recherche et catégorie
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.codeBarre || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 1 || article.categorieId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Handler pour changer d'onglet
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    
    // Charger les données appropriées selon l'onglet sélectionné
    if (newValue === 1) {
      // Onglet Journal
      loadJournalCaisse();
    } else if (newValue === 2) {
      // Onglet Historique
      if (historyTab === 'ventes') {
        loadHistoriqueVentes();
      } else {
        loadHistoriqueCaisses();
      }
    }
  };
  
  // Handler pour l'ouverture de la caisse
  const handleOuvertureCaisse = async () => {
    try {
      setLoading(true);
      
      const response = await caisseService.ouvrirCaisse({
        soldeInitial: parseFloat(caisseStatus.soldeInitial)
      });
      
      setCaisseStatus({
        isOpen: true,
        soldeInitial: parseFloat(caisseStatus.soldeInitial),
        soldeCourant: parseFloat(caisseStatus.soldeInitial),
        ouvertureCaisse: new Date().toISOString(),
        fermetureCaisse: null
      });
      
      setSnackbar({
        open: true,
        message: 'Caisse ouverte avec succès',
        severity: 'success'
      });
      
      setDialogues({ ...dialogues, ouvertureCaisse: false });
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la caisse:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erreur lors de l'ouverture de la caisse",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handler pour la fermeture de la caisse
  const handleFermetureCaisse = async () => {
    try {
      setLoading(true);
      
      const response = await caisseService.fermerCaisse({
        soldeFinal: parseFloat(reconciliation.montantEspeces),
        commentaire: reconciliation.commentaire
      });
      
      setCaisseStatus({
        ...caisseStatus,
        isOpen: false,
        fermetureCaisse: new Date().toISOString()
      });
      
      setSnackbar({
        open: true,
        message: 'Caisse fermée avec succès',
        severity: 'success'
      });
      
      setDialogues({ ...dialogues, fermetureCaisse: false });
      
      // Optionnellement, générer un rapport de caisse
      const rapportResponse = await caisseService.genererRapportCaisse();
      console.log('Rapport de caisse:', rapportResponse.data);
      
    } catch (error) {
      console.error("Erreur lors de la fermeture de la caisse:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erreur lors de la fermeture de la caisse",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handler pour la réconciliation
  const handleReconciliationChange = (e) => {
    const { name, value } = e.target;
    const numericValue = parseFloat(value) || 0;
    
    setReconciliation(prev => {
      const updated = { ...prev, [name]: numericValue };
      
      // Calculer l'écart
      if (['montantEspeces', 'montantCheques', 'montantCartes'].includes(name)) {
        const totalCompte = updated.montantEspeces + updated.montantCheques + updated.montantCartes;
        updated.ecart = totalCompte - caisseStatus.soldeCourant;
      }
      
      return updated;
    });
  };
  
  // Sélection d'un article
  const handleSelectArticle = (article) => {
    setSelectedArticle({
      article,
      quantite: 1,
      prixUnitaire: article.prixVenteHT || 0,
      remise: 0,
      tva: article.tauxTVA || 19,
      total: (article.prixVenteHT || 0) * (1 + (article.tauxTVA || 19) / 100)
    });
    
    setDialogues({ ...dialogues, articleDetails: true });
  };
  
  // Ajout rapide d'un article (sans ouvrir le dialogue)
  const handleQuickAddArticle = (article) => {
    if (article.stock <= 0) {
      setSnackbar({
        open: true,
        message: 'Stock épuisé!',
        severity: 'error'
      });
      return;
    }

    // Vérifier si l'article est déjà dans le panier
    const existingIndex = venteEnCours.articles.findIndex(item => item.article === article._id);
    
    if (existingIndex >= 0) {
      // Incrémenter la quantité
      const updatedArticles = [...venteEnCours.articles];
      const newQuantity = updatedArticles[existingIndex].quantite + 1;
      
      if (newQuantity > article.stock) {
        setSnackbar({
          open: true,
          message: 'Quantité indisponible en stock',
          severity: 'error'
        });
        return;
      }
      
      updatedArticles[existingIndex].quantite = newQuantity;
      updatedArticles[existingIndex].totalHT = updatedArticles[existingIndex].prixUnitaire * 
        newQuantity * (1 - updatedArticles[existingIndex].remise / 100);
      updatedArticles[existingIndex].totalTTC = updatedArticles[existingIndex].totalHT * 
        (1 + updatedArticles[existingIndex].tva / 100);
      
      setVenteEnCours(prev => ({
        ...prev,
        articles: updatedArticles
      }));
    } else {
      // Ajouter un nouvel article
      const newArticleItem = {
        article: article._id,
        articleData: article,
        designation: article.designation,
        reference: article.reference,
        quantite: 1,
        prixUnitaire: article.prixVenteHT || 0,
        remise: 0,
        tva: article.tauxTVA || 19,
        totalHT: article.prixVenteHT || 0,
        totalTTC: (article.prixVenteHT || 0) * (1 + (article.tauxTVA || 19) / 100)
      };
      
      setVenteEnCours(prev => ({
        ...prev,
        articles: [...prev.articles, newArticleItem]
      }));
    }
  };
  
  // Ajout d'un article depuis le dialogue détaillé
  const handleAddArticleFromDialog = () => {
    if (!selectedArticle.article) return;
    
    const newArticleItem = {
      article: selectedArticle.article._id,
      articleData: selectedArticle.article,
      designation: selectedArticle.article.designation,
      reference: selectedArticle.article.reference,
      quantite: selectedArticle.quantite,
      prixUnitaire: selectedArticle.prixUnitaire,
      remise: selectedArticle.remise,
      tva: selectedArticle.tva,
      totalHT: selectedArticle.quantite * selectedArticle.prixUnitaire * (1 - selectedArticle.remise / 100),
      totalTTC: selectedArticle.total
    };
    
    // Vérifier si l'article est déjà dans le panier
    const existingIndex = venteEnCours.articles.findIndex(item => item.article === selectedArticle.article._id);
    
    if (existingIndex >= 0) {
      // Remplacer l'article existant
      const updatedArticles = [...venteEnCours.articles];
      updatedArticles[existingIndex] = newArticleItem;
      
      setVenteEnCours(prev => ({
        ...prev,
        articles: updatedArticles
      }));
    } else {
      // Ajouter un nouvel article
      setVenteEnCours(prev => ({
        ...prev,
        articles: [...prev.articles, newArticleItem]
      }));
    }
    
    setDialogues({ ...dialogues, articleDetails: false });
  };
  
  // Mise à jour de la quantité d'un article dans le panier
  const handleUpdateQuantity = (index, increment) => {
    const updatedArticles = [...venteEnCours.articles];
    const newQuantity = updatedArticles[index].quantite + increment;
    
    if (newQuantity <= 0) {
      // Supprimer l'article si la quantité devient 0 ou négative
      updatedArticles.splice(index, 1);
    } else {
      // Mettre à jour la quantité et recalculer les totaux
      updatedArticles[index].quantite = newQuantity;
      updatedArticles[index].totalHT = updatedArticles[index].prixUnitaire * 
        newQuantity * (1 - updatedArticles[index].remise / 100);
      updatedArticles[index].totalTTC = updatedArticles[index].totalHT * 
        (1 + updatedArticles[index].tva / 100);
    }
    
    setVenteEnCours(prev => ({
      ...prev,
      articles: updatedArticles
    }));
  };
  
  // Suppression d'un article du panier
  const handleDeleteArticle = (index) => {
    const updatedArticles = [...venteEnCours.articles];
    updatedArticles.splice(index, 1);
    
    setVenteEnCours(prev => ({
      ...prev,
      articles: updatedArticles
    }));
  };
  
  // Validation de la vente
  const handleProcessPayment = async () => {
    try {
      if (!caisseStatus.isOpen) {
        setSnackbar({
          open: true,
          message: 'La caisse doit être ouverte pour effectuer une vente',
          severity: 'error'
        });
        return;
      }
      
      if (venteEnCours.articles.length === 0) {
        setSnackbar({
          open: true,
          message: 'Le panier est vide',
          severity: 'error'
        });
        return;
      }
      
      // Ouvrir le dialogue de paiement
      setDialogues({ ...dialogues, paiement: true });
    } catch (error) {
      console.error("Erreur lors de la préparation du paiement:", error);
      setSnackbar({
        open: true,
        message: error.message || "Erreur lors de la préparation du paiement",
        severity: 'error'
      });
    }
  };
  
  // Finalisation du paiement
  const handleFinalizeSale = async () => {
    try {
      setLoading(true);
      
      // Préparer les données pour l'API
      const venteData = {
        client: venteEnCours.client,
        articles: venteEnCours.articles,
        sousTotal: venteEnCours.sousTotal,
        remise: venteEnCours.remise,
        tva: venteEnCours.tva,
        totalTTC: venteEnCours.totalTTC,
        notes: venteEnCours.notes || ''
      };
      
      // Appeler l'API d'enregistrement de vente
      const response = await caisseService.enregistrerVenteEspeces(venteData);
      
      // Après la vente, mettre à jour le statut de la caisse
      const caisseStatusResponse = await caisseService.getCaisseStatus();
      setCaisseStatus({
        ...caisseStatus,
        soldeCourant: caisseStatusResponse.data.soldeCourant
      });
      
      // Rafraîchir le journal de caisse et les transactions
      loadJournalCaisse();
      loadTransactionsJournee();
      
      // Afficher message de succès
      setSnackbar({
        open: true,
        message: 'Vente enregistrée avec succès',
        severity: 'success'
      });
      
      // Réinitialiser le panier
      setVenteEnCours({
        client: null,
        articles: [],
        sousTotal: 0,
        remise: 0,
        tva: 0,
        totalTTC: 0,
        modePaiement: 'ESPECES',
        paiementDetails: {
          montantRecu: 0,
          monnaie: 0,
          reference: ''
        }
      });
      
      // Fermer le dialogue de paiement
      setDialogues({ ...dialogues, paiement: false });
      
    } catch (error) {
      console.error("Erreur lors de la finalisation de la vente:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || "Erreur lors de la finalisation de la vente",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un mouvement de caisse manuel
  const handleAddMouvement = async () => {
    try {
      if (!caisseStatus.isOpen) {
        setSnackbar({
          open: true,
          message: 'La caisse doit être ouverte pour ajouter un mouvement',
          severity: 'error'
        });
        return;
      }

      // Valider le montant
      if (!nouveauMouvement.montant || nouveauMouvement.montant <= 0) {
        setSnackbar({
          open: true,
          message: 'Veuillez saisir un montant valide',
          severity: 'error'
        });
        return;
      }

      // Valider la description
      if (!nouveauMouvement.description.trim()) {
        setSnackbar({
          open: true,
          message: 'Veuillez saisir une description',
          severity: 'error'
        });
        return;
      }

      setLoading(true);

      // Appeler l'API pour ajouter le mouvement
      const response = await caisseService.ajouterMouvement({
        type: nouveauMouvement.type,
        montant: parseFloat(nouveauMouvement.montant),
        modePaiement: nouveauMouvement.modePaiement,
        description: nouveauMouvement.description,
        reference: nouveauMouvement.reference || ''
      });

      // Mettre à jour le statut de la caisse
      const caisseStatusResponse = await caisseService.getCaisseStatus();
      setCaisseStatus({
        ...caisseStatus,
        soldeCourant: caisseStatusResponse.data.soldeCourant
      });

      // Rafraîchir le journal de caisse
      loadJournalCaisse();

      // Réinitialiser le formulaire
      setNouveauMouvement({
        type: 'ENCAISSEMENT',
        montant: 0,
        modePaiement: 'ESPECES',
        description: '',
        reference: ''
      });
	   // Ajouter à l'historique des transactions
      const newTransaction = {
        id: Date.now(),
        type: 'VENTE',
        client: venteEnCours.client?.nom || 'Client au comptoir',
        montant: venteEnCours.totalTTC,
        modePaiement: venteEnCours.modePaiement,
        date: new Date().toISOString(),
        articles: venteEnCours.articles.length
      };

      // Fermer le dialogue
      setDialogues({ ...dialogues, mouvement: false });

      // Afficher un message de succès
      setSnackbar({
        open: true,
        message: 'Mouvement de caisse enregistré avec succès',
        severity: 'success'
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du mouvement:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || "Erreur lors de l'ajout du mouvement",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

 // Impression du ticket
  const handlePrintTicket = () => {
    // TODO: Implémenter l'impression du ticket
    console.log('Impression du ticket');
    
    setSnackbar({
      open: true,
      message: 'Impression du ticket en cours...',
      severity: 'info'
    });
  };
  
  // Sélection d'un client
  const handleSelectClient = (client) => {
    setVenteEnCours(prev => ({
      ...prev,
      client
    }));
    
    setDialogues({ ...dialogues, clientSelection: false });
  };
  
  // Génération du rapport de fin de journée
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      // Appel API pour générer un rapport
      const response = await apiClient.get('api/caisse/rapport-journalier');
      
      // Télécharger ou afficher le rapport
      console.log('Rapport généré:', response.data);
      
      setSnackbar({
        open: true,
        message: 'Rapport généré avec succès',
        severity: 'success'
      });
    } catch (error) {
      console.error("Erreur lors de la génération du rapport:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Erreur lors de la génération du rapport",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handler pour le changement de mode de paiement
  const handlePaiementModeChange = (e) => {
    setVenteEnCours(prev => ({
      ...prev,
      modePaiement: e.target.value,
      paiementDetails: {
        ...prev.paiementDetails,
        montantRecu: prev.totalTTC, // Par défaut, le montant reçu est égal au total
        monnaie: 0
      }
    }));
  };
  
  // Handler pour la mise à jour des détails de paiement
  const handlePaiementDetailsChange = (e) => {
    const { name, value } = e.target;
    const numericValue = name === 'montantRecu' ? parseFloat(value) || 0 : value;
    
    setVenteEnCours(prev => {
      const details = {
        ...prev.paiementDetails,
        [name]: numericValue
      };
      
      // Calculer la monnaie si paiement en espèces
      if (name === 'montantRecu' && prev.modePaiement === 'especes') {
        details.monnaie = Math.max(0, numericValue - prev.totalTTC);
      }
      
      return {
        ...prev,
        paiementDetails: details
      };
    });
  };
  

// Fonction pour filtrer l'historique des ventes
const filtrerHistorique = (data = historiqueVentes) => {
  const filtered = data.filter(vente => {
    const venteDate = parseISO(vente.dateVente);
    const dateMatch = isWithinInterval(venteDate, {
      start: historyFilter.dateDebut,
      end: historyFilter.dateFin
    });
    
    const paiementMatch = historyFilter.modePaiement === 'tous' || 
      vente.modePaiement === historyFilter.modePaiement;
    
    const minAmountMatch = !historyFilter.minAmount || 
      vente.totalTTC >= parseFloat(historyFilter.minAmount);
    
    const maxAmountMatch = !historyFilter.maxAmount || 
      vente.totalTTC <= parseFloat(historyFilter.maxAmount);
    
    const clientMatch = !historyFilter.clientName || 
      (vente.client && vente.client.nom.toLowerCase().includes(historyFilter.clientName.toLowerCase()));
    
    return dateMatch && paiementMatch && minAmountMatch && maxAmountMatch && clientMatch;
  });
  
  setHistoriqueFiltre(filtered);
};

// Fonction pour appliquer les filtres
const handleApplyFilters = () => {
  filtrerHistorique();
  setDialogFilterOpen(false);
};

// Fonction pour réinitialiser les filtres
const handleResetFilters = () => {
  setHistoryFilter({
    dateDebut: startOfDay(new Date()),
    dateFin: endOfDay(new Date()),
    modePaiement: 'tous',
    minAmount: '',
    maxAmount: '',
    clientName: ''
  });
};

// Fonction pour exporter l'historique filtré
const handleExportHistory = () => {
  try {
    // Création d'un tableau CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Entêtes
    csvContent += "Date,Référence,Client,Articles,Montant,Mode de Paiement\n";
    
    // Données
    historiqueFiltre.forEach((vente) => {
      const dateFormatted = format(parseISO(vente.dateVente), 'dd/MM/yyyy HH:mm');
      const clientName = vente.client ? vente.client.nom : 'Client au comptoir';
      const row = [
        dateFormatted,
        vente.reference,
        clientName,
        vente.articles.length,
        vente.totalTTC.toFixed(2),
        vente.modePaiement
      ].join(",");
      csvContent += row + "\n";
    });
    
    // Créer un lien et déclencher le téléchargement
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historique_ventes_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSnackbar({
      open: true,
      message: 'Export effectué avec succès',
      severity: 'success'
    });
  } catch (error) {
    console.error("Erreur lors de l'export:", error);
    setSnackbar({
      open: true,
      message: "Erreur lors de l'export",
      severity: 'error'
    });
  }
};

// Fonction pour voir les détails d'une vente
const [selectedVente, setSelectedVente] = useState(null);
const [dialogVenteDetailsOpen, setDialogVenteDetailsOpen] = useState(false);

const handleViewVenteDetails = (vente) => {
  setSelectedVente(vente);
  setDialogVenteDetailsOpen(true);
};

// Fonction pour réimprimer un ticket
const handleReprintTicket = (vente) => {
  // TODO: Implémenter l'impression du ticket
  console.log('Réimpression du ticket de la vente', vente.reference);
  
  setSnackbar({
    open: true,
    message: 'Réimpression du ticket en cours...',
    severity: 'info'
  });
};

 // Rendu principal du composant
return (
  <Box sx={{ width: '100%' }}>
    {/* Barre d'en-tête avec statut de la caisse */}
    <Box sx={{ 
      p: 2, 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      bgcolor: caisseStatus.isOpen ? 'success.light' : 'warning.light',
      color: 'white',
      mb: 2
    }}>
      <Typography variant="h6">
        <PointOfSale sx={{ mr: 1, verticalAlign: 'middle' }} />
        Module Caisse
      </Typography>
      
      <Box>
        {caisseStatus.isOpen ? (
          <>
            <Chip
              icon={<CheckCircle />}
              label="Caisse ouverte"
              color="success"
              variant="outlined"
              sx={{ mr: 2, bgcolor: 'white' }}
            />
            <Button 
              variant="contained" 
              color="error"
              onClick={() => setDialogues({ ...dialogues, fermetureCaisse: true })}
            >
              Fermer la caisse
            </Button>
          </>
        ) : (
          <>
            <Chip
              icon={<Cancel />}
              label="Caisse fermée"
              color="error"
              variant="outlined"
              sx={{ mr: 2, bgcolor: 'white' }}
            />
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => setDialogues({ ...dialogues, ouvertureCaisse: true })}
            >
              Ouvrir la caisse
            </Button>
          </>
        )}
      </Box>
    </Box>
    
    {/* Onglets de navigation */}
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs 
        value={currentTab} 
        onChange={handleTabChange}
        aria-label="onglets caisse"
        variant="fullWidth"
      >
        <Tab 
          icon={<ShoppingCart />} 
          label="Vente Rapide" 
          iconPosition="start"
          disabled={!caisseStatus.isOpen} 
        />
        <Tab 
          icon={<AccountBalance />} 
          label="Gestion Caisse" 
          iconPosition="start" 
        />
        <Tab 
          icon={<CalculateOutlined />} 
          label="Réconciliation" 
          iconPosition="start"
          disabled={!caisseStatus.isOpen} 
        />
        <Tab 
          icon={<History />} 
          label="Historique" 
          iconPosition="start" 
        />
      </Tabs>
    </Box>
    
    {/* Contenu de l'onglet "Vente Rapide" */}
    {currentTab === 0 && (
      <Box>
        <Grid container spacing={2}>
          {/* Section catalogue articles */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Catalogue Articles
              </Typography>
              
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
                <TextField
                  variant="outlined"
                  placeholder="Rechercher un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{ width: '60%' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
                
                <FormControl size="small" sx={{ width: '35%' }}>
                  <InputLabel id="category-select-label">Catégorie</InputLabel>
                  <Select
                    labelId="category-select-label"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    label="Catégorie"
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.nom}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              
              <Grid container spacing={1}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : filteredArticles.length === 0 ? (
                  <Box sx={{ width: '100%', p: 2, textAlign: 'center' }}>
                    <Typography variant="body1" color="textSecondary">
                      Aucun article trouvé
                    </Typography>
                  </Box>
                ) : (
                  filteredArticles.map((article) => (
                    <Grid item xs={6} sm={4} md={3} key={article._id}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        onClick={() => handleSelectArticle(article)}
                      >
                        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Inventory2 sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                            <Typography variant="subtitle2" align="center" noWrap>
                              {article.designation}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" align="center">
                              {(article.prixVenteHT * (1 + article.tauxTVA / 100)).toFixed(2)} TND
                            </Typography>
                            <Box sx={{ mt: 1, width: '100%' }}>
                              <Button 
                                variant="contained" 
                                size="small" 
                                fullWidth
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAddArticle(article);
                                }}
                              >
                                <Add fontSize="small" />
                              </Button>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            </Paper>
          </Grid>
          
          {/* Section panier */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Panier
                </Typography>
                
                <Button
  variant="outlined"
  size="small"
  startIcon={<PersonOutline />}
  onClick={() => {
    if (venteEnCours.client?.nom === 'Client comptoir') {
      handleClientComptoir();
    } else {
      setDialogues({ ...dialogues, clientSelection: true });
    }
  }}
>
  {venteEnCours.client ? venteEnCours.client.nom : 'Client comptoir'}
</Button>
              </Box>
              
              {venteEnCours.articles.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="textSecondary">
                    Le panier est vide
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Article</TableCell>
                          <TableCell align="center">Qté</TableCell>
                          <TableCell align="right">Prix</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {venteEnCours.articles.map((item, index) => (
                          <TableRow key={`${item.article}-${index}`}>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                                {item.designation}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleUpdateQuantity(index, -1)}
                                >
                                  <Remove fontSize="small" />
                                </IconButton>
                                <Typography variant="body2" sx={{ mx: 1 }}>
                                  {item.quantite}
                                </Typography>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleUpdateQuantity(index, 1)}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {(item.prixUnitaire * (1 + item.tva / 100)).toFixed(2)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteArticle(index)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2">Sous-total:</Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2">{venteEnCours.sousTotal.toFixed(2)} TND</Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="body2">Remise:</Typography>
                          <TextField
                            size="small"
                            type="number"
                            value={venteEnCours.remise}
                            onChange={(e) => setVenteEnCours({ ...venteEnCours, remise: parseFloat(e.target.value) || 0 })}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                            sx={{ ml: 1, width: 70 }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2">
                          {((venteEnCours.sousTotal * venteEnCours.remise) / 100).toFixed(2)} TND
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="body2">TVA:</Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2">{venteEnCours.tva.toFixed(2)} TND</Typography>
                      </Grid>
                      
                      <Grid item xs={6}>
                        <Typography variant="subtitle1" fontWeight="bold">TOTAL:</Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {venteEnCours.totalTTC.toFixed(2)} TND
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </>
              )}
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  startIcon={<PointOfSale />}
                  onClick={handleProcessPayment}
                  disabled={venteEnCours.articles.length === 0}
                >
                  PAIEMENT
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    )}
    
    {/* Contenu de l'onglet "Gestion Caisse" */}
    {currentTab === 1 && (
      <Grid container spacing={2}>
        {/* Informations de la caisse */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
              Informations Caisse
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText 
                  primary="Statut" 
                  secondary={caisseStatus.isOpen ? "Ouverte" : "Fermée"}
                />
                <ListItemSecondaryAction>
                  <Chip 
                    color={caisseStatus.isOpen ? "success" : "error"}
                    label={caisseStatus.isOpen ? "Ouverte" : "Fermée"}
                    size="small"
                  />
                </ListItemSecondaryAction>
              </ListItem>
              
              {caisseStatus.isOpen && (
                <>
                  <ListItem>
                    <ListItemText 
                      primary="Date d'ouverture" 
                      secondary={format(new Date(caisseStatus.ouvertureCaisse || new Date()), 'dd/MM/yyyy HH:mm')}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText 
                      primary="Solde initial" 
                      secondary={`${caisseStatus.soldeInitial.toFixed(2)} TND`}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText 
                      primary="Solde actuel" 
                      secondary={`${caisseStatus.soldeCourant.toFixed(2)} TND`}
                    />
                  </ListItem>
                </>
              )}
              
              {!caisseStatus.isOpen && caisseStatus.fermetureCaisse && (
                <ListItem>
                  <ListItemText 
                    primary="Dernière fermeture" 
                    secondary={format(new Date(caisseStatus.fermetureCaisse), 'dd/MM/yyyy HH:mm')}
                  />
                </ListItem>
              )}
            </List>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              {caisseStatus.isOpen ? (
                <Button 
                  fullWidth
                  variant="contained" 
                  color="error"
                  onClick={() => setDialogues({ ...dialogues, fermetureCaisse: true })}
                  startIcon={<Close />}
                >
                  Fermer la caisse
                </Button>
              ) : (
                <Button 
                  fullWidth
                  variant="contained" 
                  color="primary"
                  onClick={() => setDialogues({ ...dialogues, ouvertureCaisse: true })}
                  startIcon={<AccountBalance />}
                >
                  Ouvrir la caisse
                </Button>
              )}
              
              <Button 
                fullWidth
                variant="outlined" 
                startIcon={<Print />}
                onClick={handleGenerateReport}
              >
                Rapport
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Journal des transactions */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
              Journal des transactions
            </Typography>
            
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date/Heure</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell align="right">Montant</TableCell>
                    <TableCell>Paiement</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                          Aucune transaction
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={transaction.type}
                            size="small"
                            color={transaction.type === 'VENTE' ? 'success' : 'primary'}
                          />
                        </TableCell>
                        <TableCell>{transaction.client}</TableCell>
                        <TableCell align="right">{transaction.montant.toFixed(2)} TND</TableCell>
                        <TableCell>
                          {transaction.modePaiement === 'especes' && <Money fontSize="small" color="success" />}
                          {transaction.modePaiement === 'carte' && <CreditCard fontSize="small" color="info" />}
                          {transaction.modePaiement === 'cheque' && <MonetizationOn fontSize="small" color="warning" />}
                          {' '}
                          {transaction.modePaiement}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    )}
    
    {/* Contenu de l'onglet "Réconciliation" */}
    {currentTab === 2 && (
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <MonetizationOn sx={{ mr: 1, verticalAlign: 'middle' }} />
              Réconciliation de caisse
            </Typography>
            
            <Typography variant="body2" sx={{ mb: 2 }}>
              Entrez les montants comptés physiquement pour réconcilier la caisse.
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Montant en espèces"
                  variant="outlined"
                  name="montantEspeces"
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">TND</InputAdornment>,
                  }}
                  value={reconciliation.montantEspeces}
                  onChange={handleReconciliationChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Montant en chèques"
                  variant="outlined"
                  name="montantCheques"
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">TND</InputAdornment>,
                  }}
                  value={reconciliation.montantCheques}
                  onChange={handleReconciliationChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Montant en cartes"
                  variant="outlined"
                  name="montantCartes"
                  type="number"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">TND</InputAdornment>,
                  }}
                  value={reconciliation.montantCartes}
                  onChange={handleReconciliationChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Commentaire"
                  variant="outlined"
                  name="commentaire"
                  multiline
                  rows={3}
                  value={reconciliation.commentaire}
                  onChange={(e) => setReconciliation({ ...reconciliation, commentaire: e.target.value })}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <AssessmentOutlined sx={{ mr: 1, verticalAlign: 'middle' }} />
              Résumé
            </Typography>
            
            <List>
              <ListItem>
                <ListItemText 
                  primary="Total en caisse (système)" 
                  secondary={`${caisseStatus.soldeCourant.toFixed(2)} TND`}
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Total physique compté" 
                  secondary={`${(reconciliation.montantEspeces + reconciliation.montantCheques + reconciliation.montantCartes).toFixed(2)} TND`}
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Écart" 
                  secondary={`${reconciliation.ecart.toFixed(2)} TND`}
                />
                <ListItemSecondaryAction>
                  <Chip 
                    color={reconciliation.ecart === 0 ? "success" : reconciliation.ecart > 0 ? "info" : "error"}
                    label={reconciliation.ecart === 0 ? "Aucun écart" : reconciliation.ecart > 0 ? "Excédent" : "Déficit"}
                    size="small"
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
            
            <Box sx={{ mt: 3 }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<SaveAlt />}
                onClick={handleFermetureCaisse}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : "Valider et fermer la caisse"}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    )}
    
    {/* Contenu de l'onglet "Historique" */}
    {currentTab === 3 && (
      <Box>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <History sx={{ mr: 1, verticalAlign: 'middle' }} />
              Historique des ventes
            </Typography>
            
            <Box>
              <Button
                variant="outlined"
                startIcon={<Tune />}
                onClick={() => setDialogFilterOpen(true)}
                sx={{ mr: 1 }}
              >
                Filtres
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<GetApp />}
                onClick={handleExportHistory}
              >
                Exporter
              </Button>
            </Box>
          </Box>
          
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Référence</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell align="center">Articles</TableCell>
                      <TableCell align="right">Montant</TableCell>
                      <TableCell>Paiement</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historiqueFiltre.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                            Aucune vente correspondant aux critères
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      historiqueFiltre.map((vente) => (
                        <TableRow key={vente._id}>
                          <TableCell>
                            {format(parseISO(vente.dateVente), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{vente.reference}</TableCell>
                          <TableCell>{vente.client ? vente.client.nom : 'Client au comptoir'}</TableCell>
                          <TableCell align="center">{vente.articles.length}</TableCell>
                          <TableCell align="right">{vente.totalTTC.toFixed(2)} TND</TableCell>
                          <TableCell>
                            {vente.modePaiement === 'especes' && <Money fontSize="small" color="success" />}
                            {vente.modePaiement === 'carte' && <CreditCard fontSize="small" color="info" />}
                            {vente.modePaiement === 'cheque' && <MonetizationOn fontSize="small" color="warning" />}
                            {' '}
                            {vente.modePaiement}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewVenteDetails(vente)}
                              color="primary"
                            >
                              <Search fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleReprintTicket(vente)}
                              color="secondary"
                            >
                              <Print fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  {historiqueFiltre.length} vente(s) au total
                </Typography>
                
                <Typography variant="body2" fontWeight="bold">
                  Total: {historiqueFiltre.reduce((sum, vente) => sum + vente.totalTTC, 0).toFixed(2)} TND
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    )}
    
    {/* Dialogue d'ouverture de caisse */}
    <Dialog
      open={dialogues.ouvertureCaisse}
      onClose={() => setDialogues({ ...dialogues, ouvertureCaisse: false })}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Ouverture de caisse</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="Solde initial (TND)"
            variant="outlined"
            type="number"
            value={caisseStatus.soldeInitial}
            onChange={(e) => setCaisseStatus({ ...caisseStatus, soldeInitial: parseFloat(e.target.value) || 0 })}
            InputProps={{
              startAdornment: <InputAdornment position="start">TND</InputAdornment>,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => setDialogues({ ...dialogues, ouvertureCaisse: false })}
        >
          Annuler
        </Button>
        <Button 
          variant="contained"
          onClick={handleOuvertureCaisse}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Confirmer"}
        </Button>
      </DialogActions>
    </Dialog>
	{/* Dialogue de sélection du client */}
<Dialog
  open={dialogues.clientSelection}
  onClose={() => setDialogues({ ...dialogues, clientSelection: false })}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle>Sélectionner un client</DialogTitle>
  <DialogContent>
    <List>
      {clients
        .filter(client => client.type === 'CLIENT')
        .map((client) => (
          <ListItem
            button
            key={client._id}
            onClick={() => handleSelectClient(client)}
          >
            <ListItemText
              primary={client.nom}
              secondary={client.matriculeFiscal}
            />
          </ListItem>
        ))}
    </List>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setDialogues({ ...dialogues, clientSelection: false })}>
      Annuler
    </Button>
  </DialogActions>
</Dialog>
    
    {/* Dialogue de fermeture de caisse */}
    <Dialog
      open={dialogues.fermetureCaisse}
      onClose={() => setDialogues({ ...dialogues, fermetureCaisse: false })}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Fermeture de caisse</DialogTitle>
      <DialogContent>
        <Typography variant="body2" gutterBottom>
          Le solde final de la caisse est de <strong>{caisseStatus.soldeCourant.toFixed(2)} TND</strong>.
          Veuillez compter physiquement l'argent en caisse et saisir les montants ci-dessous.
        </Typography>
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Montant en espèces"
              variant="outlined"
              name="montantEspeces"
              type="number"
              value={reconciliation.montantEspeces}
              onChange={handleReconciliationChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">TND</InputAdornment>,
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Montant en chèques"
              variant="outlined"
              name="montantCheques"
              type="number"
              value={reconciliation.montantCheques}
              onChange={handleReconciliationChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">TND</InputAdornment>,
              }}
            />
          </Grid>
		  <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Montant en cartes"
              variant="outlined"
              name="montantCartes"
              type="number"
              value={reconciliation.montantCartes}
              onChange={handleReconciliationChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">TND</InputAdornment>,
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Commentaire"
              multiline
              rows={3}
              value={reconciliation.commentaire}
              onChange={(e) => setReconciliation({...reconciliation, commentaire: e.target.value})}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="body2" color="textSecondary">
              Écart constaté: {reconciliation.ecart.toFixed(2)} TND
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogues({...dialogues, fermetureCaisse: false})}>
          Annuler
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleFermetureCaisse}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Confirmer fermeture"}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Dialogue de paiement */}
    <Dialog
      open={dialogues.paiement}
      onClose={() => setDialogues({...dialogues, paiement: false})}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Paiement de la vente</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Mode de paiement</FormLabel>
                <RadioGroup
                  row
                  value={venteEnCours.modePaiement}
                  onChange={handlePaiementModeChange}
                >
                  <FormControlLabel 
                    value="especes" 
                    control={<Radio />} 
                    label="Espèces" 
                  />
                  <FormControlLabel 
                    value="carte" 
                    control={<Radio />} 
                    label="Carte" 
                  />
                  <FormControlLabel 
                    value="cheque" 
                    control={<Radio />} 
                    label="Chèque" 
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {venteEnCours.modePaiement === 'especes' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Montant reçu"
                  name="montantRecu"
                  type="number"
                  value={venteEnCours.paiementDetails.montantRecu}
                  onChange={handlePaiementDetailsChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">TND</InputAdornment>,
                  }}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="h6" align="right">
                Total à payer: {venteEnCours.totalTTC.toFixed(2)} TND
              </Typography>
              {venteEnCours.modePaiement === 'especes' && (
                <Typography variant="body2" align="right" color="textSecondary">
                  Monnaie: {venteEnCours.paiementDetails.monnaie.toFixed(2)} TND
                </Typography>
              )}
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogues({...dialogues, paiement: false})}>
          Annuler
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleFinalizeSale}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Valider le paiement"}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Dialogue de détails de vente */}
    <Dialog
      open={dialogVenteDetailsOpen}
      onClose={() => setDialogVenteDetailsOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Détails de la vente #{selectedVente?.reference}</DialogTitle>
      <DialogContent>
        {selectedVente && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Client: {selectedVente.client?.nom || 'Non spécifié'}
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Article</TableCell>
                    <TableCell align="right">Quantité</TableCell>
                    <TableCell align="right">Prix unitaire</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedVente.articles.map((article) => (
                    <TableRow key={article._id}>
                      <TableCell>{article.designation}</TableCell>
                      <TableCell align="right">{article.quantite}</TableCell>
                      <TableCell align="right">{article.prixUnitaire.toFixed(2)} TND</TableCell>
                      <TableCell align="right">{(article.prixUnitaire * article.quantite).toFixed(2)} TND</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Typography variant="h6">
                Total: {selectedVente.totalTTC.toFixed(2)} TND
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogVenteDetailsOpen(false)}>Fermer</Button>
      </DialogActions>
    </Dialog>

    {/* Snackbar pour les notifications */}
    <Snackbar
      open={snackbar.open}
      autoHideDuration={6000}
      onClose={() => setSnackbar({...snackbar, open: false})}
    >
      <Alert 
        severity={snackbar.severity} 
        sx={{ width: '100%' }}
        onClose={() => setSnackbar({...snackbar, open: false})}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  </Box>
);
}

export default CaissePage;