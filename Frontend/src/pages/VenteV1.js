// client/src/pages/Ventes.js - Page principale pour la gestion des ventes
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stepper, Step, StepLabel, Paper, Button, 
  Container, CircularProgress, Snackbar, Alert, Card, Divider
} from '@mui/material';
import { Add, ArrowBack, ArrowForward, Save, Print, Email, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import config from '../config';

// Étapes du processus de vente
import ClientStep from '../components/vente/ClientStep';
import ArticlesStep from '../components/vente/ArticlesStep';
import PaiementStep from '../components/vente/PaiementStep';
import EcheancierStep from '../components/vente/EcheancierStep';
import RecapitulatifStep from '../components/vente/RecapitulatifStep';

// Liste des étapes
const steps = [
  'Sélection du client',
  'Articles/Services',
  'Mode de paiement',
  'Échéancier',
  'Validation et documents'
];

export default function VentesPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // État principal de la vente
  const [venteData, setVenteData] = useState({
    client: null,
    articles: [],
    sousTotal: 0,
    remise: 0,
    tva: 0,
    totalTTC: 0,
    modePaiement: 'especes', // especes, cheque, effet, cheques_multiples, effets_multiples, mixte
    paiementDetails: {
      montantRecu: 0,
      monnaie: 0,
      reference: '',
      banque: '',
      dateEcheance: null
    },
    echeancier: [],
    notes: '',
    soldeClient: 0,
    facture: {
      numero: '',
      date: new Date(),
      montantHT: 0,
      montantTVA: 0,
      montantTTC: 0
    }
  });

  // État pour suivre si chaque étape a été complétée
  const [stepsCompleted, setStepsCompleted] = useState({
    0: false, // Client
    1: false, // Articles
    2: false, // Paiement
    3: true,  // Échéancier (initialement ignoré si pas de paiement multiple)
    4: false  // Récapitulatif
  });

  // Vérifier si l'étape actuelle est valide avant de permettre l'avancement
  const canProceed = () => {
    switch (activeStep) {
      case 0: // Client
        return venteData.client !== null;
      case 1: // Articles
        return venteData.articles.length > 0;
      case 2: // Paiement
        return venteData.modePaiement !== '';
      case 3: // Échéancier
        // Pour les paiements multiples, vérifier que l'échéancier est complet
        if (['cheques_multiples', 'effets_multiples', 'mixte'].includes(venteData.modePaiement)) {
          const totalEcheancier = venteData.echeancier.reduce(
            (sum, item) => sum + parseFloat(item.montant || 0), 0
          );
          return Math.abs(totalEcheancier - venteData.totalTTC) < 0.01 && venteData.echeancier.length > 0;
        }
        return true;
      case 4: // Récapitulatif
        return true;
      default:
        return false;
    }
  };

  // Gérer la navigation entre les étapes
  const handleNext = () => {
    if (!canProceed()) {
      setSnackbar({ 
        open: true, 
        message: "Veuillez compléter correctement cette étape avant de continuer", 
        severity: "warning" 
      });
      return;
    }

    // Marquer l'étape actuelle comme complétée
    setStepsCompleted(prev => ({ ...prev, [activeStep]: true }));

    // Si l'utilisateur n'a pas choisi un paiement multiple, on peut sauter l'étape d'échéancier
    if (activeStep === 2 && !['cheques_multiples', 'effets_multiples', 'mixte'].includes(venteData.modePaiement)) {
      setActiveStep(activeStep + 2);
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    // Si on est à l'étape de validation et qu'on revient, on doit vérifier si on a sauté l'étape d'échéancier
    if (activeStep === 4 && !['cheques_multiples', 'effets_multiples', 'mixte'].includes(venteData.modePaiement)) {
      setActiveStep(2);
    } else {
      setActiveStep(activeStep - 1);
    }
  };

  // Mettre à jour les données de la vente
  const updateVenteData = (newData) => {
    setVenteData(prev => ({ ...prev, ...newData }));
  };
  
  const convertirModePaiement = (mode) => {
    // Assurez-vous que les valeurs correspondent à l'enum dans le modèle paiement.model.js
    const mapping = {
      'especes': 'ESPECES',
      'cheque': 'CHEQUE',
      'effet': 'EFFET',
      'cheques_multiples': 'CHEQUES_MULTIPLES',
      'effets_multiples': 'EFFETS_MULTIPLES',
      'mixte': 'PAIEMENT_MIXTE'
    };
    return mapping[mode] || mode;
  };

  // Calculer la date d'échéance pour le paiement
  const calculerDateEcheance = () => {
    // Pour les paiements différés ou échelonnés
    if (['cheque', 'effet', 'cheques_multiples', 'effets_multiples', 'mixte'].includes(venteData.modePaiement)) {
      if (venteData.paiementDetails.dateEcheance) {
        return venteData.paiementDetails.dateEcheance;
      } else if (venteData.echeancier && venteData.echeancier.length > 0) {
        // Prendre la date la plus éloignée comme date d'échéance globale
        return venteData.echeancier.reduce(
          (latest, item) => new Date(item.date) > latest ? new Date(item.date) : latest,
          new Date(venteData.echeancier[0].date)
        );
      }
    }
    return new Date(); // Date actuelle pour paiement immédiat
  };

  // Préparer les informations de paiement selon le mode choisi
  const preparerInfosPaiement = () => {
    switch (venteData.modePaiement) {
      case 'especes':
        return {
          type: 'especes',
          montant: venteData.totalTTC,
          reference: 'ESP-' + Date.now(),
          statut: 'ENCAISSE'
        };
      case 'cheque':
        return {
          type: 'cheque',
          montant: venteData.totalTTC,
          reference: venteData.paiementDetails.reference,
          banque: venteData.paiementDetails.banque,
          dateEcheance: venteData.paiementDetails.dateEcheance,
          statut: 'EN_ATTENTE'
        };
      case 'effet':
        return {
          type: 'effet',
          montant: venteData.totalTTC,
          reference: venteData.paiementDetails.reference,
          banque: venteData.paiementDetails.banque,
          dateEcheance: venteData.paiementDetails.dateEcheance,
          statut: 'EN_ATTENTE'
        };
      case 'cheques_multiples':
      case 'effets_multiples':
        return {
          type: venteData.modePaiement,
          montant: venteData.totalTTC,
          reference: 'MULTI-' + Date.now(),
          banque: venteData.echeancier[0]?.banque || 'Multiple',
          echeancier: venteData.echeancier,
          statut: 'EN_ATTENTE'
        };
      case 'mixte':
        const montantEspeces = parseFloat(venteData.paiementDetails.montantRecu || 0);
        return {
          type: 'mixte',
          montant: venteData.totalTTC,
          reference: 'MIX-' + Date.now(),
          banque: venteData.echeancier[0]?.banque || 'Multiple',
          montantEspeces: montantEspeces,
          echeancier: venteData.echeancier,
          statut: 'EN_ATTENTE'
        };
      default:
        return null;
    }
  };

  // Gérer l'enregistrement de la vente
  const handleSaveVente = async () => {
    try {
      setLoading(true);

      // Génération du numéro de transaction
      const dateNow = new Date();
      const annee = dateNow.getFullYear().toString().substr(-2);
      const mois = (dateNow.getMonth() + 1).toString().padStart(2, '0');
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const numeroTransaction = `V-${annee}${mois}-${randomSeq}`;

      // Préparer les informations de paiement
      const paiementInfo = preparerInfosPaiement();
      if (!paiementInfo) {
        throw new Error('Mode de paiement invalide');
      }

      // Vérifier les données avant l'envoi
      if (!venteData.client) {
        throw new Error('Client non sélectionné');
      }
      if (venteData.articles.length === 0) {
        throw new Error('Aucun article ajouté');
      }
      if (!venteData.modePaiement) {
        throw new Error('Mode de paiement non spécifié');
      }

      const venteToSave = {
        clientId: venteData.client._id,
        dateVente: new Date(),
        dateEcheance: venteData.dateEcheance || null,
        modePaiement: venteData.modePaiement,
        paiement: paiementInfo,
        transaction: {
          numero: numeroTransaction,
          date: new Date(),
          articles: venteData.articles.map(article => ({
            articleId: article._id,
            designation: article.designation,
            quantite: article.quantite,
            prixUnitaireHT: article.prixUnitaire,
            tauxTVA: article.tva,
            remise: article.remise || 0,
            montantHT: article.montantHT,
            montantTTC: article.montantTTC
          }))
        },
        sousTotal: venteData.sousTotal,
        remise: venteData.remise,
        tva: venteData.tva,
        totalTTC: venteData.totalTTC,
        notes: venteData.notes,
        facture: {
          numero: numeroTransaction,
          date: new Date(),
          montantHT: venteData.sousTotal,
          montantTVA: venteData.tva,
          montantTTC: venteData.totalTTC
        }
      };

      // Appel API
      const response = await apiClient.post('/ventes', venteToSave);

      // Afficher un message de succès
      setSnackbar({
        open: true,
        message: 'Vente enregistrée avec succès',
        severity: 'success'
      });

      // Rediriger vers la liste des ventes
      setTimeout(() => {
        navigate('/ventes');
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la vente:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors de l\'enregistrement de la vente',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Gérer l'enregistrement de la vente
  const handleSaveVente = async () => {
    try {
      setLoading(true);

      // Génération du numéro de transaction
      const dateNow = new Date();
      const annee = dateNow.getFullYear().toString().substr(-2);
      const mois = (dateNow.getMonth() + 1).toString().padStart(2, '0');
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      const numeroTransaction = `V-${annee}${mois}-${randomSeq}`;

      // Préparer les informations de paiement
      const paiementInfo = preparerInfosPaiement();
      if (!paiementInfo) {
        throw new Error('Mode de paiement invalide');
      }

      // Vérifier les données avant l'envoi
      if (!venteData.client) {
        throw new Error('Client non sélectionné');
      }
      if (venteData.articles.length === 0) {
        throw new Error('Aucun article ajouté');
      }
      if (!venteData.modePaiement) {
        throw new Error('Mode de paiement non spécifié');
      }

      const venteToSave = {
        clientId: venteData.client._id,
        dateVente: new Date(),
        dateEcheance: venteData.dateEcheance || null,
        modePaiement: venteData.modePaiement,
        paiement: paiementInfo,
        transaction: {
          numero: numeroTransaction,
          date: new Date(),
          articles: venteData.articles.map(article => ({
            articleId: article._id,
            designation: article.designation,
            quantite: article.quantite,
            prixUnitaireHT: article.prixUnitaire,
            tauxTVA: article.tva,
            remise: article.remise || 0,
            montantHT: article.montantHT,
            montantTTC: article.montantTTC
          }))
        },
        sousTotal: venteData.sousTotal,
        remise: venteData.remise,
        tva: venteData.tva,
        totalTTC: venteData.totalTTC,
        notes: venteData.notes,
        facture: {
          numero: numeroTransaction,
          date: new Date(),
          montantHT: venteData.sousTotal,
          montantTVA: venteData.tva,
          montantTTC: venteData.totalTTC
        }
      };

      // Appel API
      const response = await apiClient.post('/ventes', venteToSave);

      // Afficher un message de succès
      setSnackbar({
        open: true,
        message: 'Vente enregistrée avec succès',
        severity: 'success'
      });

      // Rediriger vers la liste des ventes
      setTimeout(() => {
        navigate('/ventes');
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la vente:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors de l\'enregistrement de la vente',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };



        type: venteData.modePaiement,
        montant: venteData.totalTTC,
        reference: 'MULTI-' + Date.now(),
        banque: venteData.echeancier[0]?.banque || 'Multiple',
        echeancier: venteData.echeancier,
        statut: 'EN_ATTENTE'
      };
    
    case 'mixte':
      const montantEspeces = parseFloat(venteData.paiementDetails.montantRecu || 0);
      return {
        type: 'mixte',
        montant: venteData.totalTTC,
        reference: 'MIX-' + Date.now(),
        banque: venteData.echeancier[0]?.banque || 'Multiple',
        montantEspeces: montantEspeces,
        echeancier: venteData.echeancier,
        statut: 'EN_ATTENTE' // Une partie est encaissée, mais le reste est en attente
      };
    
    default:
  const handleSaveVente = async () => {
    try {
      console.log("Début de la fonction handleSaveVente");
      setLoading(true);
      
      // Récupération des IDs depuis le localStorage
      const entrepriseId = localStorage.getItem('entrepriseId');
      const userId = localStorage.getItem('userId');
      console.log("IDs récupérés:", { entrepriseId, userId });
      
      // Vérification de la présence des IDs
      if (!entrepriseId) {
        throw new Error("Identifiant d'entreprise non trouvé. Veuillez vous reconnecter.");
      }
      
      if (!userId) {
        throw new Error("Identifiant utilisateur non trouvé. Veuillez vous reconnecter.");
      }
      
      // Vérifier les données client
      console.log("Données client:", venteData.client);
      
      setSnackbar({
        open: true,
        message: "Vente enregistrée avec succès",
        severity: "success"
      });
      
      // Rediriger vers la page de détail de la vente
      setTimeout(() => {
        navigate(`/vente/${response.data.data.vente._id}`);
      }, 1500);
      
    } catch (error) {
      console.error("[Erreur détaillée]", {
        message: error.message,
        name: error.name,
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        stack: error.stack,
        payloadSent: venteToSave
      });
      
      if (error.response?.data?.errors) {
        console.table(error.response.data.errors);
      }
      
      setSnackbar({
        open: true,
        message: error.message || error.response?.data?.message || "Erreur lors de l'enregistrement de la vente",
        severity: "error"
      });
    } finally {
      setLoading(false);
      console.log("Fin de la fonction handleSaveVente");
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <ClientStep venteData={venteData} updateVenteData={updateVenteData} />;
      case 1:
        return <ArticlesStep venteData={venteData} updateVenteData={updateVenteData} />;
      case 2:
        return <PaiementStep venteData={venteData} updateVenteData={updateVenteData} />;
      case 3:
        return <EcheancierStep venteData={venteData} updateVenteData={updateVenteData} />;
      case 4:
        return <RecapitulatifStep venteData={venteData} updateVenteData={updateVenteData} />;
      default:
        return 'Étape inconnue';
    }
  };

  return (
    <Box>
      {/* En-tête avec titre */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Nouvelle Vente</Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/ventes')}
        >
          Retour à la liste
        </Button>
      </Box>

      {/* Stepper pour montrer la progression */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={label} completed={stepsCompleted[index]}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Contenu de l'étape actuelle */}
      {getStepContent(activeStep)}

      {/* Boutons de navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
          sx={{ mr: 1 }}
        >
          Précédent
        </Button>
        <Box>
          {activeStep !== steps.length - 1 ? (
            <Button variant="contained" onClick={handleNext}>
              {activeStep === steps.length - 2 ? 'Terminer' : 'Suivant'}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleSaveVente}>
              Enregistrer la vente
            </Button>
          )}
        </Box>
      </Box>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}