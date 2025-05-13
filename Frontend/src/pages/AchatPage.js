// AchatPage.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stepper, Step, StepLabel, Paper, Button, 
  CircularProgress, Snackbar, Alert, Divider, IconButton
} from '@mui/material';
import { 
  ArrowBack, ArrowForward, Save, Print, CloudUpload,
  Money, Receipt
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import FournisseurStep from '../components/achat/FournisseurStep';
import ArticlesStep from '../components/achat/ArticlesStep';
import PaiementStep from '../components/achat/PaiementStep';
import ScanStep from '../components/achat/ScanStep';
import EcheancierStep from '../components/achat/EcheancierStep';
import RecapitulatifStep from '../components/achat/RecapitulatifStep';
import { createAchat } from '../services/achatService';
import apiClient from '../utils/apiClient';

function AchatPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [fournisseurs, setFournisseurs] = useState([]);
  const [articles, setArticles] = useState([]);
  const [achatData, setAchatData] = useState({
    fournisseur: null,
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
    scans: [] // Pour stocker les documents scannés
  });

  // Définition des étapes selon le flux spécifié
  const steps = ['Fournisseur', 'Articles/Services', 'Paiement', 'Scan des Pièces', 'Échéancier', 'Validation et Documents'];

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [fournisseurRes, articleRes] = await Promise.all([
          apiClient.get('/api/tiers?type=FOURNISSEUR'),
          apiClient.get('/api/articles')
        ]);
        setFournisseurs(fournisseurRes.data);
        setArticles(articleRes.data);
      } catch (error) {
        console.error('Erreur lors du chargement des données initiales:', error);
        setSnackbar({
          open: true,
          message: 'Erreur lors du chargement des données',
          severity: 'error'
        });
      }
    };
    fetchInitialData();
  }, []);

  const handleNext = () => {
    // Validation pour l'étape Fournisseur
    if (activeStep === 0 && !achatData.fournisseur) {
      return setSnackbar({
        open: true, 
        message: 'Veuillez sélectionner un fournisseur', 
        severity: 'error'
      });
    }
    
    // Validation pour l'étape Articles
    if (activeStep === 1 && achatData.articles.length === 0) {
      return setSnackbar({
        open: true,
        message: 'Veuillez ajouter au moins un article',
        severity: 'error'
      });
    }
    
    // Validation pour l'étape Paiement
    if (activeStep === 2 && !achatData.modePaiement) {
      return setSnackbar({
        open: true,
        message: 'Veuillez sélectionner un mode de paiement',
        severity: 'error'
      });
    }
    
    // Logique pour la navigation après l'étape de paiement
    if (activeStep === 2) {
      if (achatData.modePaiement === 'especes') {
        // Pour les espèces, aller directement à la validation
        setActiveStep(5);
        return;
      } else if (achatData.modePaiement === 'cheque' || achatData.modePaiement === 'effet') {
        // Pour chèque unique ou effet unique, aller au scan des pièces puis à la validation
        setActiveStep(3);
        return;
      } else {
        // Pour les paiements multiples ou mixtes, suivre le flux normal
        setActiveStep(3);
        return;
      }
    }
    
    // Navigation après l'étape scan
    if (activeStep === 3) {
      if (achatData.modePaiement === 'cheques_multiples' || 
          achatData.modePaiement === 'effets_multiples' || 
          achatData.modePaiement === 'mixte') {
        // Aller à l'échéancier
        setActiveStep(4);
      } else {
        // Pour paiement simple (chèque unique, effet unique), aller directement à la validation
        setActiveStep(5);
      }
      return;
    }
    
    // Validation pour l'étape Échéancier
    if (activeStep === 4) {
      if (achatData.echeancier.length === 0) {
        return setSnackbar({
          open: true,
          message: 'Veuillez définir un échéancier',
          severity: 'error'
        });
      }
      
      // Vérifier si la somme de l'échéancier correspond au total
      const totalEcheancier = achatData.echeancier.reduce((sum, item) => sum + parseFloat(item.montant), 0);
      const totalDu = achatData.modePaiement === 'mixte' 
        ? achatData.totalTTC - parseFloat(achatData.paiementDetails.montantRecu || 0)
        : achatData.totalTTC;
        
      if (Math.abs(totalEcheancier - totalDu) > 0.01) { // Permettre de petites différences d'arrondi
        return setSnackbar({
          open: true,
          message: `Le total de l'échéancier (${totalEcheancier.toFixed(2)}€) ne correspond pas au montant dû (${totalDu.toFixed(2)}€)`,
          severity: 'error'
        });
      }
      
      // Passer à l'étape finale
      setActiveStep(5);
      return;
    }
    
    // Navigation par défaut
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    // Logique pour gérer le retour en arrière en fonction des étapes sautées
    if (activeStep === 5) {
      // Pour l'étape de validation, déterminer où revenir en fonction du mode de paiement
      if (achatData.modePaiement === 'especes') {
        setActiveStep(2); // Revenir à l'étape de paiement
      } else if (achatData.modePaiement === 'cheque' || achatData.modePaiement === 'effet') {
        setActiveStep(3); // Revenir à l'étape de scan
      } else {
        setActiveStep(4); // Revenir à l'étape d'échéancier
      }
      return;
    }
    
    if (activeStep === 4 && achatData.modePaiement === 'especes') {
      setActiveStep(2); // Retourner à l'étape de paiement
      return;
    }
    
    // Navigation par défaut
    setActiveStep((prev) => prev - 1);
  };

  const handleDataChange = (newData) => {
    setAchatData(prev => ({ ...prev, ...newData }));
  };

  const handleSaveAchat = async () => {
    try {
      setLoading(true);
      
      // Récupérer les IDs utilisateur et entreprise depuis localStorage
      const entrepriseId = localStorage.getItem('entrepriseId');
      const userId = localStorage.getItem('userId');
      
      if (!entrepriseId || !userId) {
        throw new Error("Identifiants non trouvés. Veuillez vous reconnecter.");
      }
      
      // Valider les données essentielles
      if (!achatData.fournisseur || !achatData.fournisseur._id) {
        throw new Error('Veuillez sélectionner un fournisseur');
      }
      
      if (achatData.articles.length === 0) {
        throw new Error('Veuillez ajouter au moins un article');
      }
      
      if (!achatData.modePaiement) {
        throw new Error('Veuillez sélectionner un mode de paiement');
      }
      
      // Utiliser le service pour créer l'achat
      await createAchat(achatData, { entrepriseId, userId });
      
      // Afficher un message de succès
      setSnackbar({
        open: true,
        message: 'Achat enregistré avec succès',
        severity: 'success'
      });
      
      // Rediriger vers la liste des achats après un court délai
      setTimeout(() => {
        navigate('/achats');
      }, 2000);
      
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      
      // Afficher un message d'erreur plus utile
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || "Erreur lors de l'enregistrement",
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImprimer = () => {
    console.log('Impression du document d\'achat');
    setSnackbar({
      open: true,
      message: 'Impression du document en cours...',
      severity: 'info'
    });
  };

  // Déterminer si l'étape actuelle doit être affichée en fonction du mode de paiement
  const shouldShowScanStep = () => {
    return achatData.modePaiement !== 'especes';
  };

  const shouldShowEcheancierStep = () => {
    return achatData.modePaiement === 'cheques_multiples' || 
           achatData.modePaiement === 'effets_multiples' || 
           achatData.modePaiement === 'mixte';
  };

  // Personnaliser les étiquettes du stepper en fonction du mode de paiement
  const getAdjustedSteps = () => {
    let adjustedSteps = [...steps];
    
    if (!shouldShowScanStep()) {
      adjustedSteps = adjustedSteps.filter(step => step !== 'Scan des Pièces');
    }
    
    if (!shouldShowEcheancierStep()) {
      adjustedSteps = adjustedSteps.filter(step => step !== 'Échéancier');
    }
    
    return adjustedSteps;
  };

  // Mapper activeStep à l'index d'étape ajusté
  const getStepperActiveStep = () => {
    const adjustedSteps = getAdjustedSteps();
    return adjustedSteps.indexOf(steps[activeStep]) !== -1 ? 
      adjustedSteps.indexOf(steps[activeStep]) : 
      adjustedSteps.length - 1;
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <FournisseurStep achatData={achatData} updateAchatData={handleDataChange} />;
      case 1:
        return <ArticlesStep achatData={achatData} updateAchatData={handleDataChange} />;
      case 2:
        return <PaiementStep achatData={achatData} updateAchatData={handleDataChange} />;
      case 3:
        return <ScanStep achatData={achatData} updateAchatData={handleDataChange} />;
      case 4:
        return <EcheancierStep achatData={achatData} updateAchatData={handleDataChange} />;
      case 5:
        return <RecapitulatifStep 
          achatData={achatData} 
          updateAchatData={handleDataChange} 
          onImprimer={handleImprimer}
        />;
      default:
        return 'Étape inconnue';
    }
  };

  return (
    <Box>
      {/* En-tête avec titre */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Nouvel Achat</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep === 5 && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Print />}
              onClick={handleImprimer}
            >
              Imprimer
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAchat}
            disabled={loading || activeStep !== 5}
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </Box>
      </Box>

      {/* Stepper - ajusté en fonction du mode de paiement */}
      <Stepper activeStep={getStepperActiveStep()} sx={{ mb: 4 }}>
        {getAdjustedSteps().map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Contenu de l'étape */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        {getStepContent(activeStep)}
      </Paper>

      {/* Boutons de navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined" 
          onClick={handleBack} 
          disabled={activeStep === 0} 
          startIcon={<ArrowBack />}
        >
          Précédent
        </Button>
        
        {activeStep < 5 && (
          <Button 
            variant="contained" 
            onClick={handleNext} 
            endIcon={<ArrowForward />}
          >
            Suivant
          </Button>
        )}
      </Box>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AchatPage;