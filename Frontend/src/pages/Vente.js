import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stepper, Step, StepLabel, Paper, Button, 
  Container, CircularProgress, Snackbar, Alert, Card, Divider,
  Grid, TextField, Autocomplete, IconButton, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem,
  Chip
} from '@mui/material';
import { 
  Add, ArrowBack, ArrowForward, Save, Print, Email, CheckCircle,
  Remove, Add as AddIcon, Delete, Edit, Search, CalendarMonth,
  Receipt, Money, CreditCard, ReceiptLong, Description, Send,
  ArrowDropDown, Close, Download, LinkOutlined
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import config from '../config';
import { generateDocument, previewDocument, DOCUMENT_TYPES } from '../services/documentService';
// Import des composants des étapes de vente
import ClientStep from '../components/vente/ClientStep';
import ArticlesStep from '../components/vente/ArticlesStep';
import PaiementStep from '../components/vente/PaiementStep';
import EcheancierStep from '../components/vente/EcheancierStep';
import ValidationStep from '../components/vente/RecapitulatifStep';
import { createVente, updateVente } from '../services/venteService';
import { useAuth } from '../contexts/AuthContext';

import DocumentGenerationPanel from '../components/vente/DocumentGenerationPanel';

// Définition des types de documents sources et destinations possibles
const SOURCE_DOCUMENT_TYPES = {
  DEVIS: 'DEVIS',
  BON_LIVRAISON: 'BON_LIVRAISON', 
  FACTURE: 'FACTURE',
  FACTURE_PARTIELLE: 'FACTURE_PARTIELLE'
};

function VentePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [clients, setClients] = useState([]);
  const [articles, setArticles] = useState([]);
  const [venteData, setVenteData] = useState({
    client: null,
    articles: [],
    sousTotal: 0,
    remise: 0,
    tva: 0,
    totalTTC: 0,
    modePaiement: 'especes',
    paiementDetails: {
      montantRecu: 0,
      monnaie: 0,
      reference: '',
      banque: '',
      dateEcheance: null
    },
    echeancier: [],
    notes: '',
    documents: [],
    sourceDocument: null,
    fluxAutomatique: false,
    etapesEffectuees: [],
    clientLocked: false,
    articlesLocked: false,
    paiementLocked: false
  });
  
  const [echeancierDialogOpen, setEcheancierDialogOpen] = useState(false);
  const [printMenuAnchor, setPrintMenuAnchor] = useState(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  
  // Récupérer le type de document depuis l'URL ou le state
  const params = new URLSearchParams(location.search);
  const documentType = params.get('type') || 'FACTURE_TTC';
  
  // Définir les étapes en fonction du type de document
  const getSteps = () => {
    switch (documentType) {
      case 'FACTURE_PROFORMA':
        // Pour un devis, on n'a besoin que du client, des articles et de la validation
        return ['Client', 'Articles/Services', 'Validation et Documents'];
        
      case 'BON_LIVRAISON':
        // Pour un bon de livraison, on a besoin de tout sauf de l'échéancier
        return ['Client', 'Articles/Services', 'Paiement','Échéancier', 'Validation et Documents'];
        
      case 'FACTURE_TTC':
      default:
        // Pour une facture, on a tout le flux complet
        return ['Client', 'Articles/Services', 'Paiement', 'Échéancier', 'Validation et Documents'];
    }
  };
  
  const steps = getSteps();

  useEffect(() => {
    // Vérifier si l'utilisateur est authentifié
    if (!user) {
      navigate('/login');
      return;
    }

    // Vérifier que les données utilisateur sont valides
    if (!user.id || !user.entrepriseId) {
      console.error('Données utilisateur invalides:', user);
      setSnackbar({
        open: true,
        message: 'Session invalide. Veuillez vous reconnecter.',
        severity: 'error'
      });
      navigate('/login');
      return;
    }

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [clientsResponse, articlesResponse] = await Promise.all([
          apiClient.get('/api/tiers?type=client'),
          apiClient.get('/api/articles')
        ]);
        setClients(clientsResponse.data);
        setArticles(articlesResponse.data);

        // Vérifier si nous avons reçu un ou plusieurs documents sources via les paramètres d'URL
        const params = new URLSearchParams(location.search);
        const sourceId = params.get('sourceId');
        const sourceIds = params.get('sourceIds')?.split(',') || [];
        const sourceType = params.get('sourceType');
        
        if (sourceIds.length > 0 && sourceType) {
          // Traiter la transformation depuis plusieurs documents
          await initialiserVenteDepuisSourceMultiple(sourceIds, sourceType);
        } else if (sourceId && sourceType) {
          // Traiter un seul document source
          await initialiserVenteDepuisSource(sourceId, sourceType);
        } else if (location.state?.sourceId && location.state?.sourceType) {
          await initialiserVenteDepuisSource(location.state.sourceId, location.state.sourceType);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données initiales:', error);
        setSnackbar({
          open: true,
          message: 'Erreur lors du chargement des données',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [location, user, navigate]);

  // Fonction pour initialiser une vente à partir de plusieurs documents sources
  const initialiserVenteDepuisSourceMultiple = async (documentIds, documentType) => {
    try {
      setLoading(true);
      
      console.log('Initialisation de vente multiple avec IDs:', documentIds, 'de type', documentType);
      
      // Récupérer les documents sources individuellement au lieu d'utiliser l'API transformerDocuments
      const sourceDocumentsPromises = documentIds.map(id => 
        apiClient.get(`api/ventes/${id}`)
      );
      
      const sourceDocumentsResponses = await Promise.all(sourceDocumentsPromises);
      const sourceDocuments = sourceDocumentsResponses.map(response => response.data);
      
      if (sourceDocuments.length === 0) {
        throw new Error('Aucun document source trouvé');
      }
      
      console.log('Documents sources récupérés:', sourceDocuments.length);
      console.log('Structure du premier document:', sourceDocuments[0]);
      
      // Tentative de récupération directe des lignes de transaction si nécessaire
      let lignesRecuperees = [];
      
      // Essayons de récupérer les lignes via notre nouvel endpoint API
      if (sourceDocuments[0].transactionId && sourceDocuments[0].transactionId._id) {
        try {
          console.log('Tentative de récupération des lignes via l\'API pour la transaction:', sourceDocuments[0].transactionId._id);
          const lignesResponse = await apiClient.get(`/api/transactions/${sourceDocuments[0].transactionId._id}/lignes`);
          
          if (lignesResponse?.data && Array.isArray(lignesResponse.data) && lignesResponse.data.length > 0) {
            lignesRecuperees = lignesResponse.data;
            console.log('Lignes récupérées via API:', lignesRecuperees.length, lignesRecuperees);
          } else {
            console.log('Aucune ligne trouvée via l\'API, recherche dans le document source');
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des lignes via API:', error);
          console.log('Recherche des lignes dans le document source comme alternative...');
        }
      }
      
      // Si l'API n'a pas fonctionné, rechercher dans le document source
      if (lignesRecuperees.length === 0) {
        console.log('Recherche des lignes directement dans le document...');
        
        // Essayer toutes les structures possibles où les articles pourraient se trouver
        if (sourceDocuments[0].transaction && Array.isArray(sourceDocuments[0].transaction.lignes)) {
          console.log('Lignes trouvées dans transaction.lignes');
          lignesRecuperees = sourceDocuments[0].transaction.lignes;
        } 
        else if (sourceDocuments[0].transactionId && Array.isArray(sourceDocuments[0].transactionId.lignesTransaction)) {
          console.log('Lignes trouvées dans transactionId.lignesTransaction');
          lignesRecuperees = sourceDocuments[0].transactionId.lignesTransaction;
        }
      }
      
      // S'il n'y a toujours pas de lignes mais qu'on a une transaction avec des montants, créer une ligne par défaut
      if (lignesRecuperees.length === 0 && (sourceDocuments[0].transaction || sourceDocuments[0].transactionId)) {
        console.log('Création d\'une ligne par défaut basée sur les montants de la transaction');
        
        // Essayer de récupérer un article par défaut depuis la liste des articles
        let articleParDefaut = null;
        if (articles && articles.length > 0) {
          // Privilégier un article de type service ou générique si disponible
          articleParDefaut = articles.find(a => a.type === 'SERVICE') || articles[0];
          console.log('Article par défaut trouvé dans la liste:', articleParDefaut);
        }
        
        const transaction = sourceDocuments[0].transaction || sourceDocuments[0].transactionId;
        if (transaction && transaction.montantTotalHT > 0) {
          // Si nous n'avons pas d'article par défaut, utilisons le type SERVICE qui ne nécessite pas d'articleId
          const articleType = articleParDefaut ? 'PRODUIT' : 'SERVICE';
          
          lignesRecuperees = [{
            designation: "Articles du document source",
            reference: "AUTO-" + Date.now(),
            quantite: 1,
            prixUnitaireHT: transaction.montantTotalHT,
            prixUnitaire: transaction.montantTotalHT,
            tauxTVA: transaction.montantTotalHT > 0 ? (transaction.montantTaxes / transaction.montantTotalHT * 100).toFixed(2) : 19,
            remise: 0,
            articleId: articleParDefaut ? articleParDefaut._id : null,
            articleData: articleParDefaut,
            type: articleType, // PRODUIT ou SERVICE selon disponibilité de l'article
            montantHT: transaction.montantTotalHT,
            montantTTC: transaction.montantTotalTTC
          }];
          console.log(`Ligne par défaut créée de type ${articleType} à partir des montants de transaction:`, lignesRecuperees);
        }
      }
      
      // Ajout d'un log détaillé pour examen de la structure
      console.log('Propriétés niveau racine du document:', Object.keys(sourceDocuments[0]));
      if (sourceDocuments[0].transactionId) {
        console.log('Propriétés dans transactionId:', Object.keys(sourceDocuments[0].transactionId));
        
        // Vérifier si lignesTransaction existe sous une forme ou une autre
        if (sourceDocuments[0].transactionId.lignesTransaction) {
          console.log('lignesTransaction trouvé, contenu:', sourceDocuments[0].transactionId.lignesTransaction);
        } else if (sourceDocuments[0].transactionId.lignetransaction) {
          console.log('lignetransaction trouvé, contenu:', sourceDocuments[0].transactionId.lignetransaction);
        }
        
        // Vérifier si le document a une propriété _id qui pourrait être utilisée pour une requête directe
        if (sourceDocuments[0].transactionId._id) {
          console.log('ID de transaction détecté, tentative de récupération directe des lignes...');
          try {
            const transactionId = sourceDocuments[0].transactionId._id;
            console.log('Récupération des lignes pour la transaction:', transactionId);
            
            // Nous pourrions envisager une requête API ici, mais pour l'instant
            // nous allons continuer avec les données existantes
          } catch (error) {
            console.error('Erreur lors de la récupération directe des lignes:', error);
          }
        }
      }
      if (sourceDocuments[0].transaction) {
        console.log('Propriétés dans transaction:', Object.keys(sourceDocuments[0].transaction));
        
        // Vérifier si transaction.lignes existe
        if (sourceDocuments[0].transaction.lignes) {
          console.log('transaction.lignes trouvé, contenu:', sourceDocuments[0].transaction.lignes);
        }
      }
      
      // Vérifier que tous les documents ont le même client
      const firstDoc = sourceDocuments[0];
      const clientInfo = firstDoc.client || firstDoc.clientId;
      
      if (!clientInfo) {
        throw new Error('Client introuvable dans le premier document source');
      }
      
      console.log('Client des documents sources:', clientInfo);
      
      // Rechercher le client complet dans la liste des clients si on n'a que l'ID
      let clientComplet = clientInfo;
      if (typeof clientInfo === 'string' || clientInfo._id) {
        const clientId = typeof clientInfo === 'string' ? clientInfo : clientInfo._id;
        const clientTrouve = clients.find(c => c._id === clientId);
        if (clientTrouve) {
          clientComplet = clientTrouve;
        }
      }
      
      // Fusionner les articles de tous les documents
      const allArticles = [];
      sourceDocuments.forEach(doc => {
        console.log('Traitement du document:', doc._id);
        
        // Tenter d'extraire les articles depuis toutes les structures possibles
        let articlesDoc = [];
        
        // 0. Vérifier d'abord si on a récupéré des lignes directement depuis le document source
        if (lignesRecuperees.length > 0) {
          console.log('Utilisation des lignes récupérées directement du document:', lignesRecuperees.length);
          articlesDoc = lignesRecuperees;
        }
        // 1. Vérifier ensuite doc.articles
        else if (doc.articles && Array.isArray(doc.articles) && doc.articles.length > 0) {
          console.log('Articles trouvés dans doc.articles:', doc.articles.length);
          articlesDoc = doc.articles;
        }
        // 2. Vérifier ensuite doc.transaction.lignes
        else if (doc.transaction && doc.transaction.lignes && Array.isArray(doc.transaction.lignes)) {
          console.log('Articles trouvés dans doc.transaction.lignes:', doc.transaction.lignes.length);
          articlesDoc = doc.transaction.lignes;
        }
        // 3. Vérifier doc.transactionId.lignesTransaction
        else if (doc.transactionId && doc.transactionId.lignesTransaction && Array.isArray(doc.transactionId.lignesTransaction)) {
          console.log('Articles trouvés dans doc.transactionId.lignesTransaction:', doc.transactionId.lignesTransaction.length);
          articlesDoc = doc.transactionId.lignesTransaction;
        }
        // 4. Vérifier doc.transactionId.lignetransaction (au singulier)
        else if (doc.transactionId && doc.transactionId.lignetransaction && Array.isArray(doc.transactionId.lignetransaction)) {
          console.log('Articles trouvés dans doc.transactionId.lignetransaction:', doc.transactionId.lignetransaction.length);
          articlesDoc = doc.transactionId.lignetransaction;
        }
        // 5. Vérifier doc.lignes
        else if (doc.lignes && Array.isArray(doc.lignes)) {
          console.log('Articles trouvés dans doc.lignes:', doc.lignes.length);
          articlesDoc = doc.lignes;
        }
        
        if (articlesDoc.length === 0) {
          console.warn('Aucun article trouvé dans le document:', doc._id);
          return;
        }
        
        // Convertir les lignes en articles
        articlesDoc.forEach(article => {
          // Normaliser les propriétés pour avoir une structure cohérente
          const articleNormalise = {
            designation: article.designation || article.nom || 'Article sans nom',
            reference: article.reference || article.code || '',
            quantite: parseFloat(article.quantite) || 1,
            prixUnitaire: parseFloat(article.prixUnitaire || article.prixUnitaireHT) || 0,
            prixUnitaireHT: parseFloat(article.prixUnitaireHT || article.prixUnitaire) || 0,
            remise: parseFloat(article.remise) || 0,
            tva: parseFloat(article.tva || article.tauxTVA) || 19,
            tauxTVA: parseFloat(article.tauxTVA || article.tva) || 19,
            // Conserver les références à l'article réel en base de données
            articleId: article.articleId ? (typeof article.articleId === 'object' ? article.articleId._id : article.articleId) : null,
            articleData: article.articleData || article.articleId || article,
            // Si aucun articleId n'est défini et que le type est PRODUIT, changer le type en SERVICE
            type: article.articleId ? (article.type || 'PRODUIT') : 'SERVICE',
            totalHT: 0,
            totalTTC: 0,
            montantHT: parseFloat(article.montantHT) || 0,
            montantTTC: parseFloat(article.montantTTC) || 0
          };
          
          // Calculer les totaux pour cet article s'ils ne sont pas déjà définis
          if (articleNormalise.montantHT === 0) {
            articleNormalise.montantHT = articleNormalise.quantite * 
              articleNormalise.prixUnitaireHT * 
              (1 - articleNormalise.remise / 100);
          }
          
          if (articleNormalise.montantTTC === 0) {
            articleNormalise.montantTTC = articleNormalise.montantHT * 
              (1 + articleNormalise.tauxTVA / 100);
          }
          
          articleNormalise.totalHT = articleNormalise.montantHT;
          articleNormalise.totalTTC = articleNormalise.montantTTC;
          
          // Vérifier si l'article existe déjà dans allArticles
          const existingIndex = allArticles.findIndex(a => {
            // Essayer différentes propriétés pour comparer les articles
            if (a.articleData && articleNormalise.articleData) {
              if (a.articleData._id && articleNormalise.articleData._id) {
                return a.articleData._id === articleNormalise.articleData._id;
              }
              if (a.articleData.id && articleNormalise.articleData.id) {
                return a.articleData.id === articleNormalise.articleData.id;
              }
            }
            // Si on ne peut pas comparer par ID, comparer par désignation et référence
            return a.designation === articleNormalise.designation && 
                   a.reference === articleNormalise.reference;
          });
          
          if (existingIndex >= 0) {
            // Si l'article existe, incrémenter la quantité
            allArticles[existingIndex].quantite += articleNormalise.quantite;
            // Recalculer le total
            allArticles[existingIndex].totalHT = allArticles[existingIndex].quantite * 
              allArticles[existingIndex].prixUnitaire * 
              (1 - allArticles[existingIndex].remise / 100);
            allArticles[existingIndex].totalTTC = allArticles[existingIndex].totalHT * 
              (1 + allArticles[existingIndex].tva / 100);
          } else {
            // Sinon, ajouter le nouvel article
            console.log('Ajout d\'un nouvel article:', {
              designation: articleNormalise.designation,
              reference: articleNormalise.reference,
              prix: articleNormalise.prixUnitaire,
              quantite: articleNormalise.quantite
            });
            allArticles.push(articleNormalise);
          }
        });
      });
      
      console.log('Articles fusionnés:', allArticles.length, allArticles);
      
      if (allArticles.length === 0) {
        console.warn('Aucun article trouvé dans les documents sources. Création d\'un article par défaut.');
        
        // Créer un article par défaut pour éviter l'erreur bloquante
        // Récupérer les montants depuis différentes structures possibles
        const montantHT = sourceDocuments[0].transaction?.montantTotalHT || 
                        sourceDocuments[0].transactionId?.montantTotalHT || 
                        sourceDocuments[0].montantTotalHT || 
                        150;
                        
        const montantTTC = sourceDocuments[0].transaction?.montantTotalTTC || 
                        sourceDocuments[0].transactionId?.montantTotalTTC || 
                        sourceDocuments[0].montantTotalTTC || 
                        178.5;
                        
        const tauxTVA = 19;  // Par défaut

        // Récupérer un article existant pour le modèle
        let articleModele = null;
        if (articles && articles.length > 0) {
          articleModele = articles[0];
          console.log('Utilisation d\'un article modèle:', articleModele);
        }
        
        const articleParDefaut = {
          designation: 'Articles transformés depuis le document source',
          reference: 'AUTO-' + Date.now(),
          quantite: 1,
          prixUnitaire: montantHT,
          prixUnitaireHT: montantHT,
          remise: 0,
          tva: tauxTVA,
          tauxTVA: tauxTVA,
          // Si un articleModele existe, on utilise ses propriétés pour avoir un ID valide
          articleData: articleModele || { 
            _id: '681a2c0a648f19ad08bfa1a8', // ID d'un article par défaut
            nom: 'Articles transformés depuis le document source',
            prix: montantHT,
            type: 'PRODUIT'
          },
          articleId: articleModele ? articleModele._id : '681a2c0a648f19ad08bfa1a8', // ID d'un article par défaut
          type: 'PRODUIT',
          totalHT: montantHT,
          totalTTC: montantTTC,
          montantHT: montantHT,
          montantTTC: montantTTC
        };
        
        allArticles.push(articleParDefaut);
        console.log('Article par défaut créé:', articleParDefaut);
      }
      
      // Calculer les totaux
      let sousTotal = 0;
      let totalTVA = 0;
      let totalTTC = 0;
      
      allArticles.forEach(article => {
        sousTotal += article.totalHT;
        totalTVA += article.totalTTC - article.totalHT;
        totalTTC += article.totalTTC;
      });
      
      console.log('Totaux calculés:', { sousTotal, totalTVA, totalTTC });
      
      // Déterminer les étapes déjà complétées selon le type de documents sources
      const etapesEffectuees = [];
      
      // Définir les données de paiement en fonction du type de transformation
      let modePaiement = 'especes';
      let paiementDetails = {
        montantRecu: 0,
        monnaie: 0,
        reference: '',
        banque: '',
        dateEcheance: null
      };
      let echeancier = [];
      
      // Si c'est une transformation de BL en facture, récupérer les infos de paiement
      if (documentType === 'BON_LIVRAISON') {
        const sourceBL = sourceDocuments[0];
        modePaiement = sourceBL.modePaiement || modePaiement;
        paiementDetails = sourceBL.paiementDetails || paiementDetails;
        echeancier = sourceBL.echeancier || echeancier;
      }
      
      // Préparer les données pour la nouvelle vente
      const transformationData = {
        client: clientComplet,
        articles: allArticles,
        sousTotal: sousTotal,
        remise: 0,
        tva: totalTVA,
        totalTTC: totalTTC,
        modePaiement: modePaiement,
        paiementDetails: paiementDetails,
        echeancier: echeancier,
        notes: `Créé à partir de ${documentIds.length} ${documentType === 'FACTURE_PROFORMA' ? 'devis' : 'bons de livraison'}`
      };
      
      console.log('Données de transformation générées:', transformationData);
      
      // Mettre à jour le state avec les données fusionnées
      setVenteData({
        client: transformationData.client,
        articles: transformationData.articles,
        sousTotal: transformationData.sousTotal,
        remise: transformationData.remise,
        tva: transformationData.tva,
        totalTTC: transformationData.totalTTC,
        modePaiement: transformationData.modePaiement,
        paiementDetails: transformationData.paiementDetails,
        echeancier: transformationData.echeancier,
        notes: transformationData.notes,
        // Information sur les documents sources
        sourceDocuments: documentIds.map(id => ({
          type: documentType,
          id: id
        })),
        fluxAutomatique: true,
        etapesEffectuees: etapesEffectuees,
        // Propriétés pour le verrouillage des champs
        clientLocked: true,  // Le client est toujours verrouillé lors d'une transformation
        articlesLocked: documentType === 'BON_LIVRAISON', // Articles verrouillés seulement pour BL→Facture
        paiementLocked: false // Le paiement n'est jamais verrouillé, peut être modifié
      });
      
      // Toujours commencer à l'étape 0 (client) pour voir la progression complète
      setActiveStep(0);
      
      console.log('Initialisation depuis sources multiples terminée avec succès');
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation depuis les documents sources:', error);
      setSnackbar({
        open: true,
        message: `Erreur: ${error.message || 'Impossible de charger les documents sources'}`,
        severity: 'error'
      });
      
      // Rediriger vers la liste des ventes après un court délai en cas d'erreur
      setTimeout(() => navigate('/ventes'), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour initialiser une vente à partir d'un seul document source
  const initialiserVenteDepuisSource = async (documentId, documentType) => {
    try {
      setLoading(true);
      
      // Récupérer les données du document source
      const response = await apiClient.get(`api/ventes/${documentId}`);
      const sourceDoc = response.data;
      
      if (!sourceDoc) {
        throw new Error(`Document source ${documentType} #${documentId} introuvable`);
      }
      
      // Déterminer les étapes déjà complétées et l'étape de départ selon le type de document
      let etapesEffectuees = [];
      let etapeDepart = 0;
      
      // Pour tous les types de documents, client et articles sont déjà remplis
      etapesEffectuees = ['client', 'articles'];
      
      switch (documentType) {
        case 'FACTURE_PROFORMA':
          // Pour un devis vers BL, on démarre au paiement, articles modifiables
          etapeDepart = 2; // Paiement (index 2)
          break;
          
        case 'BON_LIVRAISON':
          // Pour un BL vers facture, on garde toutes les données, articles verrouillés
          etapeDepart = 2; // Paiement (index 2)
          etapesEffectuees.push('paiement');
          if (sourceDoc.echeancier && sourceDoc.echeancier.length > 0) {
            etapesEffectuees.push('echeancier');
          }
          break;
          
        case 'FACTURE_TTC':
          // Pour une facture (quand on génère un avoir), on va à l'étape de validation
          etapeDepart = 4; // Validation (index 4)
          etapesEffectuees.push('paiement');
          if (sourceDoc.echeancier && sourceDoc.echeancier.length > 0) {
            etapesEffectuees.push('echeancier');
          }
          break;
      }
      
      // Mettre à jour le state avec les données du document source
      setVenteData({
        client: sourceDoc.client,
        articles: sourceDoc.articles || [],
        sousTotal: sourceDoc.sousTotal || sourceDoc.montantTotalHT || 0,
        remise: sourceDoc.remise || 0,
        tva: sourceDoc.tva || sourceDoc.montantTaxes || 0,
        totalTTC: sourceDoc.totalTTC || sourceDoc.montantTotalTTC || 0,
        modePaiement: sourceDoc.modePaiement || 'especes',
        paiementDetails: sourceDoc.paiementDetails || {
          montantRecu: 0,
          monnaie: 0,
          reference: '',
          banque: '',
          dateEcheance: null
        },
        echeancier: sourceDoc.echeancier || [],
        notes: sourceDoc.notes || '',
        // Information sur le document source
        sourceDocument: { 
          type: documentType, 
          id: documentId,
          reference: sourceDoc.numeroDocument || documentId,
          date: sourceDoc.dateCreation || sourceDoc.date || new Date().toISOString()
        },
        fluxAutomatique: true,
        etapesEffectuees: etapesEffectuees,
        // Propriétés pour le verrouillage des champs
        clientLocked: true, // Le client est toujours verrouillé lors d'une transformation
        articlesLocked: documentType === 'BON_LIVRAISON', // Verrouillé seulement pour transformation BL→Facture 
        paiementLocked: false // Le paiement n'est jamais verrouillé
      });
      
      // Définir l'étape active
      setActiveStep(etapeDepart);
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation depuis le document source:', error);
      setSnackbar({
        open: true,
        message: `Erreur: ${error.message || 'Impossible de charger le document source'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    // Validation for Client step
    if (activeStep === 0 && !venteData.client) {
      setSnackbar({
        open: true,
        message: 'Veuillez sélectionner un client',
        severity: 'error'
      });
      return;
    }
    
    // Si c'est un devis, on saute directement à l'étape de validation après les articles
    if (documentType === 'FACTURE_PROFORMA' && activeStep === 1) {
      setActiveStep(2); // Saute à l'étape de validation
      return;
    }
    
    // Validation for Articles step
    if (activeStep === 1 && venteData.articles.length === 0) {
      setSnackbar({
        open: true,
        message: 'Veuillez ajouter au moins un article',
        severity: 'error'
      });
      return;
    }
    
    // Validation for Payment step
    if (activeStep === 2 && !venteData.modePaiement) {
      setSnackbar({
        open: true,
        message: 'Veuillez sélectionner un mode de paiement',
        severity: 'error'
      });
      return;
    }
    
    // Skip the echéancier step if the payment method doesn't require it
    if (activeStep === 2) {
      const modesPaiementWithEcheancier = ['cheques_multiples', 'effets_multiples', 'mixte'];
      const currentMode = venteData.modePaiement.toLowerCase();
      
      console.log('Mode de paiement sélectionné:', venteData.modePaiement);
      console.log('Nécessite un échéancier:', modesPaiementWithEcheancier.includes(currentMode));
      
      if (!modesPaiementWithEcheancier.includes(currentMode)) {
        console.log('Saut de l\'étape échéancier car non nécessaire pour ce mode de paiement');
      setActiveStep((prevStep) => prevStep + 2); // Skip to validation step
      return;
      }
    }
    
    // Validation for Écheancier step
    if (activeStep === 3 && 
        (venteData.modePaiement === 'cheques_multiples' || 
         venteData.modePaiement === 'effets_multiples' || 
         venteData.modePaiement === 'mixte')) {
      
      if (venteData.echeancier.length === 0) {
        setSnackbar({
          open: true,
          message: 'Veuillez définir un échéancier',
          severity: 'error'
        });
        return;
      }
      
      // Check if the sum of echéancier matches the total
      const totalEcheancier = venteData.echeancier.reduce((sum, item) => sum + parseFloat(item.montant), 0);
      const totalDu = venteData.modePaiement === 'mixte' 
        ? venteData.totalTTC - parseFloat(venteData.paiementDetails.montantRecu || 0)
        : venteData.totalTTC;
        
      if (Math.abs(totalEcheancier - totalDu) > 0.01) { // Allow small rounding differences
        setSnackbar({
          open: true,
          message: `Le total de l'échéancier (${totalEcheancier.toFixed(2)}€) ne correspond pas au montant dû (${totalDu.toFixed(2)}€)`,
          severity: 'error'
        });
        return;
      }
    }
    
    // Si nous sommes en mode flux automatique, marquer l'étape courante comme effectuée
    if (venteData.fluxAutomatique) {
      let etapeActuelle;
      switch (activeStep) {
        case 0: etapeActuelle = 'client'; break;
        case 1: etapeActuelle = 'articles'; break;
        case 2: etapeActuelle = 'paiement'; break;
        case 3: etapeActuelle = 'echeancier'; break;
        case 4: etapeActuelle = 'validation'; break;
        default: etapeActuelle = '';
      }
      
      if (etapeActuelle && !venteData.etapesEffectuees.includes(etapeActuelle)) {
        setVenteData(prev => ({
          ...prev,
          etapesEffectuees: [...prev.etapesEffectuees, etapeActuelle]
        }));
      }
    }
    
    // Move to next step
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    // Special handling for going back from validation step when échéancier is not applicable
    if (activeStep === 4 && !shouldShowEcheancierStep()) {
      setActiveStep(2); // Go back to payment step
      return;
    }
    
    // Si on est en mode flux automatique et qu'on revient à une étape déjà préremplie
    if (venteData.fluxAutomatique) {
      // Trouver la dernière étape non effectuée avant l'étape actuelle
      const etapesIds = ['client', 'articles', 'paiement', 'echeancier', 'validation'];
      const indexEtapeActuelle = activeStep;
      
      // Parcourir les étapes précédentes pour trouver la dernière non effectuée
      for (let i = indexEtapeActuelle - 1; i >= 0; i--) {
        if (!venteData.etapesEffectuees.includes(etapesIds[i])) {
          setActiveStep(i);
          return;
        }
      }
    }
    
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleDataChange = (newData) => {
    setVenteData((prev) => ({
      ...prev,
      ...newData
    }));
  };

  const preparerInfosPaiement = () => {
    switch (venteData.modePaiement) {
      case 'especes':
        return {
          type: 'ESPECES',
          montant: venteData.totalTTC,
          montantRecu: venteData.paiementDetails.montantRecu,
          monnaie: venteData.paiementDetails.monnaie,
          reference: 'ESP-' + Date.now(),
          statut: 'PAYE'
        };

      case 'cheque':
        return {
          type: 'CHEQUE_UNIQUE',
          montant: venteData.totalTTC,
          reference: venteData.paiementDetails.reference,
          banque: venteData.paiementDetails.banque,
          dateEcheance: venteData.paiementDetails.dateEcheance,
          statut: 'EN_ATTENTE'
        };

      case 'effet':
        return {
          type: 'EFFET_UNIQUE',
          montant: venteData.totalTTC,
          reference: venteData.paiementDetails.reference,
          banque: venteData.paiementDetails.banque,
          dateEcheance: venteData.paiementDetails.dateEcheance,
          statut: 'EN_ATTENTE'
        };

      case 'cheques_multiples':
        return {
          type: 'CHEQUES_MULTIPLES',
          montant: venteData.totalTTC,
          reference: venteData.paiementDetails.reference,
          banque: venteData.paiementDetails.banque,
          dateEcheance: venteData.paiementDetails.dateEcheance,
          statut: 'EN_ATTENTE'
        };
    
      case 'effets_multiples':
        return {
          type: 'EFFETS_MULTIPLES',
          montant: venteData.totalTTC,
          reference: 'MULTI-' + Date.now(),
          banque: venteData.echeancier[0]?.banque || 'Multiple',
          echeancier: venteData.echeancier,
          statut: 'EN_ATTENTE'
        };

      case 'mixte':
        const montantEspeces = parseFloat(venteData.paiementDetails.montantRecu || 0);
        return {
          type: 'PAIEMENT_MIXTE',
          montant: venteData.totalTTC,
          reference: 'MIX-' + Date.now(),
          banque: venteData.echeancier[0]?.banque || 'Multiple',
          montantEspeces: montantEspeces,
          echeancier: venteData.echeancier,
          statut: montantEspeces === venteData.totalTTC ? 'PAYE' : 'EN_ATTENTE'
        };

      default:
        return null;
    }
  };

  const genererNumeroFacture = () => {
    const dateNow = new Date();
    const annee = dateNow.getFullYear().toString().substr(-2);
    const mois = (dateNow.getMonth() + 1).toString().padStart(2, '0');
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `F-${annee}${mois}-${randomSeq}`;
  };
  
  
  const modesPaiementBackend = {
    especes: 'ESPECES',
    cheque: 'CHEQUE_UNIQUE',
    effet: 'EFFET_UNIQUE',
    cheques_multiples: 'CHEQUES_MULTIPLES',
    effets_multiples: 'EFFETS_MULTIPLES',
    mixte: 'PAIEMENT_MIXTE'
  };

  const handleSaveVente = async (preventRedirect) => {
    try {
      setLoading(true);
      
      // Get user and enterprise IDs from localStorage
      const entrepriseId = localStorage.getItem('entrepriseId');
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');
      
      console.log('Identifiants pour la sauvegarde:', { 
        entrepriseId: !!entrepriseId, 
        userId: !!userId, 
        token: !!token 
      });
      
      if (!entrepriseId || !userId) {
        // Check if we have a token
        if (!token) {
          console.error('Pas de token disponible');
          setSnackbar({
            open: true,
            message: "Session expirée. Veuillez vous reconnecter.",
            severity: 'error'
          });
          
          // Rediriger vers login après un court délai
          setTimeout(() => {
            window.location.href = '/login?session_expired=true';
          }, 2000);
          return;
        }
        
        // If we have a token but no IDs, try to refresh the user data
        try {
          console.log('Tentative de rafraîchissement des données utilisateur avec le token');
          const response = await apiClient.get('/api/auth/verify');
          console.log('Réponse de vérification:', response.data);
          
          if (response.data.success && response.data.isValid && response.data.user) {
            // Store the new user data
            console.log('Stockage des nouvelles données utilisateur:', response.data.user);
            localStorage.setItem('userId', response.data.user._id);
            localStorage.setItem('entrepriseId', response.data.user.entrepriseId);
            
            // Continue with the updated IDs
            const newEntrepriseId = response.data.user.entrepriseId;
            const newUserId = response.data.user._id;
            
            console.log('Continuation avec les nouveaux IDs:', { newUserId, newEntrepriseId });
            
            // Continue with rest of the function using the new IDs
            return await continueVenteSaving(newEntrepriseId, newUserId, preventRedirect);
          } else {
            console.error('Token invalide ou données utilisateur manquantes');
            setSnackbar({
              open: true,
              message: "Session invalide. Veuillez vous reconnecter.",
              severity: 'error'
            });
            
            // Rediriger vers login après un court délai
            setTimeout(() => {
              window.location.href = '/login?session_expired=true';
            }, 2000);
            return;
          }
        } catch (error) {
          console.error('Erreur lors du rafraîchissement des données utilisateur:', error);
          setSnackbar({
            open: true,
            message: "Erreur d'authentification. Veuillez vous reconnecter.",
            severity: 'error'
          });
          
          // Rediriger vers login après un court délai
          setTimeout(() => {
            window.location.href = '/login?session_expired=true';
          }, 2000);
          return;
        }
      }
      
      // Continue with the original IDs
      return await continueVenteSaving(entrepriseId, userId, preventRedirect);
      
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || "Erreur lors de l'enregistrement",
        severity: 'error'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fonction auxiliaire pour continuer la sauvegarde une fois l'authentification vérifiée
  const continueVenteSaving = async (entrepriseId, userId, preventRedirect) => {
    try {
      // Validate essential data
      if (!venteData.client || !venteData.client._id) {
        throw new Error('Veuillez sélectionner un client');
      }
      
      if (venteData.articles.length === 0) {
        throw new Error('Veuillez ajouter au moins un article');
      }
      
      if (!venteData.modePaiement) {
        throw new Error('Veuillez sélectionner un mode de paiement');
      }

      // Préparer les données de la vente avec le bon type de document
      const venteDataToSave = {
        ...venteData,
        typeDocument: documentType,
        modePaiement: venteData.modePaiement === 'mixte' ? 'MIXTE' : venteData.modePaiement.toUpperCase()
      };

      // Pour le paiement mixte, calculer le montant restant à échelonner
      if (venteData.modePaiement === 'mixte') {
        const montantEspeces = parseFloat(venteData.paiementDetails.montantRecu || 0);
        const montantTotal = parseFloat(venteData.totalTTC || 0);
        const montantRestant = montantTotal - montantEspeces;
        
        if (venteData.echeancier && venteData.echeancier.length > 0) {
          const totalEcheancier = venteData.echeancier.reduce((sum, echeance) => sum + parseFloat(echeance.montant || 0), 0);
          if (Math.abs(totalEcheancier - montantRestant) > 0.01) {
            throw new Error(`Le total de l'échéancier (${totalEcheancier.toFixed(2)}€) ne correspond pas au montant restant à échelonner (${montantRestant.toFixed(2)}€)`);
          }
        }
      }

      let result;
      console.log('Envoi de la vente au serveur avec IDs:', { entrepriseId, userId });
      
      if (venteData.id) {
        result = await updateVente(venteData.id, venteDataToSave, { entrepriseId, userId });
      } else {
        result = await createVente(venteDataToSave, { entrepriseId, userId });
      }
      
      console.log('Résultat de la sauvegarde:', result);
      
      if (result.success && result.data.vente) {
        setVenteData(prev => ({ ...prev, id: result.data.vente._id }));
      }
      
      setSnackbar({ open: true, message: 'Vente enregistrée', severity: 'success' });

      // Ne rediriger que si on n'est pas sur la dernière étape et que preventRedirect est false
      if (!preventRedirect && activeStep !== steps.length - 1 && !previewDialogOpen) {
        setTimeout(() => navigate('/ventes'), 2000);
      }

      return result;
      
    } catch (error) {
      console.error("Erreur lors de l'enregistrement dans continueVenteSaving:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || "Erreur lors de l'enregistrement",
        severity: 'error'
      });
      throw error;
    }
  };

  const handlePrintMenuOpen = (event) => {
    setPrintMenuAnchor(event.currentTarget);
  };
  
  const handlePrintMenuClose = () => {
    setPrintMenuAnchor(null);
  };
  
  const handleImprimerFacture = async (documentType) => {
    try {
      setDocumentPreviewLoading(true);
      handlePrintMenuClose();
      setSelectedDocumentType(documentType); // Définir le type avant tout

      let targetVenteId = venteData.id;
      
      // Sauvegarder si nécessaire
      if (!targetVenteId) {
        targetVenteId = await handleSaveVente(); // Empêcher la redirection
        
        // Augmenter le délai pour permettre au backend de finaliser l'enregistrement
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Générer la prévisualisation
      const pdfBlob = await previewDocument(targetVenteId, documentType);
      const url = URL.createObjectURL(pdfBlob);
      
      setPreviewUrl(url);
      setPreviewDialogOpen(true);

    } catch (error) {
      console.error("Erreur détaillée lors de l'impression:", error);
      
      // Ajouter plus de détails à l'erreur affichée
      setSnackbar({
        open: true,
        message: `Erreur : ${error.message}${error.response?.data?.message ? ` - ${error.response.data.message}` : ''}`,
        severity: 'error'
      });
    } finally {
      setDocumentPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewDialogOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // Rediriger vers la liste des ventes après la fermeture de la prévisualisation
    setTimeout(() => navigate('/ventes'), 1000);
  };
  
  const handleDownloadDocument = async () => {
    try {
      setLoading(true);
      const pdfBlob = await generateDocument(venteData.id, selectedDocumentType);
      
      // Créer URL et simuler un téléchargement
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      
      // Nom du fichier selon le type
      let fileName = `${venteData.client?.nom || 'client'}_${selectedDocumentType}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSnackbar({
        open: true,
        message: 'Document téléchargé avec succès',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors du téléchargement: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnvoyerParEmail = (documentType) => {
    console.log('Envoi de la facture par email', documentType);
    // TODO: Implémenter l'envoi par email
    setSnackbar({
      open: true,
      message: 'La fonctionnalité d\'envoi par email sera disponible prochainement',
      severity: 'info'
    });
  };

  const getStepContent = (step) => {
    // Pour un devis, on a un flux simplifié
    if (documentType === 'FACTURE_PROFORMA') {
      switch (step) {
        case 0:
          return <ClientStep venteData={venteData} updateVenteData={handleDataChange} />;
        case 1:
          return <ArticlesStep venteData={venteData} updateVenteData={handleDataChange} />;
        case 2: // Validation pour devis
          return <ValidationStep 
            venteData={venteData} 
            updateVenteData={handleDataChange} 
            onImprimer={handleImprimerFacture}
            onEnvoyer={handleEnvoyerParEmail}
            onSaveVente={handleSaveVente}
            isDevis={true}
          />;
        default:
          return 'Étape inconnue';
      }
    }
    
    // Pour un bon de livraison, on saute l'étape d'échéancier
   switch (step) {
      case 0:
        return <ClientStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 1:
        return <ArticlesStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 2:
        return <PaiementStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 3:
        console.log('Affichage de l\'étape 3:', { modePaiement: venteData.modePaiement, shouldShow: shouldShowEcheancierStep() });
        if (shouldShowEcheancierStep()) {
          return <EcheancierStep venteData={venteData} updateVenteData={handleDataChange} />;
        } else {
          // Redirection vers l'étape de validation si on arrive ici sans nécessiter d'échéancier
          setTimeout(() => setActiveStep(4), 0);
          return <CircularProgress />;
        }
      case 4:
        return <ValidationStep 
          venteData={venteData} 
          updateVenteData={handleDataChange} 
          onImprimer={handleImprimerFacture}
          onEnvoyer={handleEnvoyerParEmail}
          onSaveVente={async (preventRedirect) => {
            try {
              const result = await handleSaveVente(preventRedirect);
              console.log('Résultat de handleSaveVente:', result);
              return result;
            } catch (error) {
              console.error('Erreur dans onSaveVente:', error);
              throw error;
            }
          }}
        />;
      default:
        return 'Étape inconnue';
      }
    
    // Pour une facture, on a tout le flux
    switch (step) {
      case 0:
        return <ClientStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 1:
        return <ArticlesStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 2:
        return <PaiementStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 3:
        console.log('Affichage de l\'étape 3:', { modePaiement: venteData.modePaiement, shouldShow: shouldShowEcheancierStep() });
        if (shouldShowEcheancierStep()) {
          return <EcheancierStep venteData={venteData} updateVenteData={handleDataChange} />;
        } else {
          // Redirection vers l'étape de validation si on arrive ici sans nécessiter d'échéancier
          setTimeout(() => setActiveStep(4), 0);
          return <CircularProgress />;
        }
      case 4:
        return <ValidationStep 
          venteData={venteData} 
          updateVenteData={handleDataChange} 
          onImprimer={handleImprimerFacture}
          onEnvoyer={handleEnvoyerParEmail}
          onSaveVente={async (preventRedirect) => {
            try {
              const result = await handleSaveVente(preventRedirect);
              console.log('Résultat de handleSaveVente:', result);
              return result;
            } catch (error) {
              console.error('Erreur dans onSaveVente:', error);
              throw error;
            }
          }}
        />;
      default:
        return 'Étape inconnue';
    }
  };

  // Determine if current step should be shown based on payment method
  const shouldShowEcheancierStep = () => {
    const modesPaiementWithEcheancier = ['cheques_multiples', 'effets_multiples', 'mixte'];
    const currentMode = venteData.modePaiement.toLowerCase();
    
    return modesPaiementWithEcheancier.includes(currentMode);
  };

  // Customize stepper labels based on payment method
  const getAdjustedSteps = () => {
    if (!shouldShowEcheancierStep()) {
      return [steps[0], steps[1], steps[2], steps[4]];
    }
    return steps;
  };

  // Map activeStep to adjusted step index
  const getStepperActiveStep = () => {
    if (!shouldShowEcheancierStep() && activeStep === 4) {
      return 3; // Show as active on the adjusted stepper
    }
    return activeStep;
  };

  const getDocumentTitle = (documentType) => {
    switch (documentType) {
      case DOCUMENT_TYPES.FACTURE_TTC:
        return 'Facture TTC';
      case DOCUMENT_TYPES.FACTURE_HT:
        return 'Facture Hors Taxes';
      case DOCUMENT_TYPES.BON_LIVRAISON:
        return 'Bon de Livraison';
      case DOCUMENT_TYPES.AVOIR:
        return 'Avoir';
      case DOCUMENT_TYPES.FACTURE_RAS:
        return 'Facture avec Retenue à la Source';
      case DOCUMENT_TYPES.FACTURE_FODEC:
        return 'Facture avec FODEC';
      default:
        return 'Document';
    }
  };

  // Fonction pour obtenir la description du document source
  const getSourceDocumentDescription = () => {
    if (!venteData.sourceDocument) return null;
    
    const { type, reference } = venteData.sourceDocument;
    let typeName = '';
    
    switch (type) {
      case SOURCE_DOCUMENT_TYPES.BON_LIVRAISON:
        typeName = 'Bon de Livraison';
        break;
      case SOURCE_DOCUMENT_TYPES.DEVIS:
        typeName = 'Devis';
        break;
      case SOURCE_DOCUMENT_TYPES.FACTURE:
        typeName = 'Facture';
        break;
      case SOURCE_DOCUMENT_TYPES.FACTURE_PARTIELLE:
        typeName = 'Facture Partielle';
        break;
      default:
        typeName = type;
    }
    
    return `${typeName} #${reference}`;
  };

  // Fonction pour naviguer vers le document source
  const navigateToSourceDocument = () => {
    if (!venteData.sourceDocument) return;
    
    const { type, id } = venteData.sourceDocument;
    let route = '';
    
    switch (type) {
      case SOURCE_DOCUMENT_TYPES.BON_LIVRAISON:
        route = `/bons-livraison/${id}`;
        break;
      case SOURCE_DOCUMENT_TYPES.DEVIS:
        route = `/devis/${id}`;
        break;
      case SOURCE_DOCUMENT_TYPES.FACTURE:
      case SOURCE_DOCUMENT_TYPES.FACTURE_PARTIELLE:
        route = `/factures/${id}`;
        break;
      default:
        console.error('Type de document source inconnu:', type);
        return;
    }
    
    navigate(route);
  };

  return (
    <Box>
      {/* En-tête avec titre et info document source */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4">Nouvelle Vente</Typography>
          {venteData.sourceDocument && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Basé sur: {getSourceDocumentDescription()}
              </Typography>
              <IconButton 
                size="small" 
                onClick={navigateToSourceDocument}
                sx={{ ml: 1 }}
                title="Voir le document source"
              >
                <LinkOutlined fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
        
        <Box>
          {/* Bouton Annuler uniquement */}
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => navigate('/ventes')}
            startIcon={<Close />}
          >
            Annuler
          </Button>
        </Box>
      </Box>
      
      {/* Stepper */}
      <Stepper activeStep={getStepperActiveStep()} alternativeLabel sx={{ mb: 4 }}>
        {getAdjustedSteps().map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {/* Contenu de l'étape actuelle */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          getStepContent(activeStep)
        )}
      </Paper>
      
      {/* Boutons de navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          startIcon={<ArrowBack />}
          disabled={activeStep === 0 || loading}
        >
          Retour
        </Button>
        
        <Box>
          {activeStep === steps.length - 1 ? (
            <>
              {!venteData.id ? (
                // Si la vente n'est pas encore enregistrée, afficher seulement le bouton d'enregistrement
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleSaveVente()}
                  startIcon={<Save />}
                  disabled={loading || venteData.id}
                >
                  {venteData.id ? 'Déjà enregistré' : 'Finaliser et Sauvegarder'}
                </Button>
              ) : (
                // Si la vente est enregistrée, afficher les boutons de mise à jour et d'impression
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSaveVente()}
                    startIcon={<Save />}
                    disabled={loading || !venteData.id}
                    sx={{ mr: 2 }}
                  >
                    Mettre à jour
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handlePrintMenuOpen}
                    startIcon={<Print />}
                    disabled={loading}
                    endIcon={<ArrowDropDown />}
                  >
                    Imprimer
                  </Button>
                  
                  <Menu
                    anchorEl={printMenuAnchor}
                    open={Boolean(printMenuAnchor)}
                    onClose={handlePrintMenuClose}
                  >
                    {documentType === 'FACTURE_PROFORMA' && (
                      <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.FACTURE_PROFORMA)}>
                        <Description sx={{ mr: 1 }} /> Devis
                      </MenuItem>
                    )}
                    
                    {documentType === 'BON_LIVRAISON' && (
                      <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.BON_LIVRAISON)}>
                        <ReceiptLong sx={{ mr: 1 }} /> Bon de Livraison
                      </MenuItem>
                    )}
                    
                    {documentType === 'FACTURE_TTC' && (
                      <>
                        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.FACTURE_TTC)}>
                          <Receipt sx={{ mr: 1 }} /> Facture TTC
                        </MenuItem>
                        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.FACTURE_HT)}>
                          <Receipt sx={{ mr: 1 }} /> Facture HT
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.FACTURE_RAS)}>
                          <Description sx={{ mr: 1 }} /> Facture avec RAS
                        </MenuItem>
                        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.FACTURE_FODEC)}>
                          <Description sx={{ mr: 1 }} /> Facture avec FODEC
                        </MenuItem>
                      </>
                    )}
                  </Menu>
                </>
              )}
            </>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              endIcon={<ArrowForward />}
              disabled={loading}
            >
              Suivant
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Dialog de prévisualisation de document */}
      <Dialog
        open={previewDialogOpen}
        onClose={handleClosePreview}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {selectedDocumentType ? getDocumentTitle(selectedDocumentType) : 'Aperçu du Document'}
          </Typography>
          <IconButton onClick={handleClosePreview}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {documentPreviewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : previewUrl ? (
            <Box sx={{ width: '100%', height: '70vh' }}>
              <iframe
                src={previewUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Aperçu du document"
              />
            </Box>
          ) : (
            <Typography>Impossible de générer l'aperçu</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDownloadDocument} 
            variant="contained" 
            startIcon={<Download />}
            disabled={!previewUrl || documentPreviewLoading}
          >
            Télécharger
          </Button>
          <Button 
            onClick={() => handleEnvoyerParEmail(selectedDocumentType)} 
            variant="contained"
            color="primary"
            startIcon={<Send />}
            disabled={!previewUrl || documentPreviewLoading}
          >
            Envoyer par Email
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Message de notification */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
      >
        <Alert 
          onClose={() => setSnackbar({...snackbar, open: false})} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default VentePage;