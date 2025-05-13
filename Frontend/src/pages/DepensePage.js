// DepensePage.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stepper, Step, StepLabel, Paper, Button, 
  CircularProgress, Snackbar, Alert, Divider, IconButton
} from '@mui/material';
import { 
  ArrowBack, ArrowForward, Save, Print, CalendarMonth,
  Payments, ReceiptLong, Repeat
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import InformationsStep from '../components/depense/InformationsStep';
import PaiementStep from '../components/depense/PaiementStep';
import JustificatifStep from '../components/depense/JustificatifStep';
import PeriodiciteStep from '../components/depense/PeriodiciteStep';
import RecapitulatifStep from '../components/depense/RecapitulatifStep';
import { createDepense } from '../services/depenseService';
import apiClient from '../utils/apiClient';

function DepensePage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [categories, setCategories] = useState([]);
  const [depenseData, setDepenseData] = useState({
    categorie: '',
    montant: 0,
    dateDepense: new Date(),
    beneficiaire: null,
    description: '',
    estRecurrente: false,
    periodicite: {
      frequence: 'MENSUELLE',
      dateDebut: new Date(),
      dateFin: null,
      nombreOccurrences: 0,
      notifications: {
        delaiPreAvis: 3,
        canaux: ['APPLICATION'],
        rappels: false
      }
    },
    paiement: {
      statut: 'A_PAYER',
      modePaiement: 'ESPECES',
      datePaiement: null,
      reference: '',
      banque: ''
    },
    justificatifs: [],
    notes: ''
  });

  // Définition des étapes
  const steps = ['Informations', 'Paiement', 'Justificatif', 'Périodicité', 'Récapitulatif'];

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [tiersRes, categoriesRes] = await Promise.all([
          apiClient.get('/api/tiers'),
          apiClient.get('/api/categories?type=DEPENSE')
        ]);
        setBeneficiaires(tiersRes.data);
        setCategories(categoriesRes.data);
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
    // Validation pour l'étape Informations
    if (activeStep === 0) {
      if (!depenseData.categorie) {
        return setSnackbar({
          open: true, 
          message: 'Veuillez sélectionner une catégorie', 
          severity: 'error'
        });
      }
      
      if (!depenseData.montant || depenseData.montant <= 0) {
        return setSnackbar({
          open: true,
          message: 'Veuillez saisir un montant valide',
          severity: 'error'
        });
      }
    }
    
    // Validation pour l'étape Paiement
    if (activeStep === 1) {
      if (depenseData.paiement.statut === 'PAYEE' && !depenseData.paiement.datePaiement) {
        return setSnackbar({
          open: true,
          message: 'Veuillez saisir une date de paiement',
          severity: 'error'
        });
      }
      
      if (depenseData.paiement.modePaiement !== 'ESPECES' && !depenseData.paiement.banque) {
        return setSnackbar({
          open: true,
          message: 'Veuillez indiquer la banque',
          severity: 'error'
        });
      }
      
      if ((depenseData.paiement.modePaiement === 'CHEQUE' || depenseData.paiement.modePaiement === 'EFFET') && !depenseData.paiement.reference) {
        return setSnackbar({
          open: true,
          message: 'Veuillez saisir une référence',
          severity: 'error'
        });
      }
    }
    
    // Gérer le flux en fonction de l'option récurrente
    if (activeStep === 2) {
      if (!depenseData.estRecurrente) {
        // Si la dépense n'est pas récurrente, aller directement à la récapitulation
        setActiveStep(4);
        return;
      }
    }
    
    // Validation pour l'étape Périodicité
    if (activeStep === 3) {
      if (!depenseData.periodicite.frequence) {
        return setSnackbar({
          open: true,
          message: 'Veuillez sélectionner une fréquence',
          severity: 'error'
        });
      }
      
      if (!depenseData.periodicite.dateDebut) {
        return setSnackbar({
          open: true,
          message: 'Veuillez définir une date de début',
          severity: 'error'
        });
      }
      
      // Vérifier qu'on a soit une date de fin, soit un nombre d'occurrences
      if (!depenseData.periodicite.dateFin && !depenseData.periodicite.nombreOccurrences) {
        return setSnackbar({
          open: true,
          message: 'Veuillez définir une date de fin ou un nombre d\'occurrences',
          severity: 'error'
        });
      }
    }
    
    // Navigation par défaut
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    // Logique pour gérer le retour en arrière
    if (activeStep === 4 && !depenseData.estRecurrente) {
      // Si on est à la récapitulation et que la dépense n'est pas récurrente, revenir à l'étape des justificatifs
      setActiveStep(2);
      return;
    }
    
    // Navigation par défaut
    setActiveStep((prev) => prev - 1);
  };

  const handleDataChange = (newData) => {
    setDepenseData(prev => ({ ...prev, ...newData }));
  };

  const handleSaveDepense = async () => {
    try {
      setLoading(true);
      
      // Récupérer les IDs utilisateur et entreprise depuis localStorage
      const entrepriseId = localStorage.getItem('entrepriseId');
      const userId = localStorage.getItem('userId');
      
      if (!entrepriseId || !userId) {
        throw new Error("Identifiants non trouvés. Veuillez vous reconnecter.");
      }
      
      // Valider les données essentielles
      if (!depenseData.categorie) {
        throw new Error('Veuillez sélectionner une catégorie');
      }
      
      if (!depenseData.montant || depenseData.montant <= 0) {
        throw new Error('Veuillez saisir un montant valide');
      }
      
      // Utiliser le service pour créer la dépense
      await createDepense({
        ...depenseData,
        entrepriseId,
        creePar: userId
      });
      
      // Afficher un message de succès
      setSnackbar({
        open: true,
        message: 'Dépense enregistrée avec succès',
        severity: 'success'
      });
      
      // Rediriger vers la liste des dépenses après un court délai
      setTimeout(() => {
        navigate('/depenses');
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
    console.log('Impression du document de dépense');
    setSnackbar({
      open: true,
      message: 'Impression du document en cours...',
      severity: 'info'
    });
  };

  // Déterminer si l'étape de périodicité doit être affichée
  const shouldShowPeriodiciteStep = () => {
    return depenseData.estRecurrente;
  };

  // Personnaliser les étiquettes du stepper
  const getAdjustedSteps = () => {
    let adjustedSteps = [...steps];
    
    if (!shouldShowPeriodiciteStep()) {
      adjustedSteps = adjustedSteps.filter(step => step !== 'Périodicité');
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
        return <InformationsStep 
                depenseData={depenseData} 
                updateDepenseData={handleDataChange} 
                categories={categories}
                beneficiaires={beneficiaires}
               />;
      case 1:
        return <PaiementStep depenseData={depenseData} updateDepenseData={handleDataChange} />;
      case 2:
        return <JustificatifStep depenseData={depenseData} updateDepenseData={handleDataChange} />;
      case 3:
        return <PeriodiciteStep depenseData={depenseData} updateDepenseData={handleDataChange} />;
      case 4:
        return <RecapitulatifStep 
          depenseData={depenseData} 
          updateDepenseData={handleDataChange} 
          onImprimer={handleImprimer}
          categories={categories}
        />;
      default:
        return 'Étape inconnue';
    }
  };

  return (
    <Box>
      {/* En-tête avec titre */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Nouvelle Dépense</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep === 4 && (
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
            onClick={handleSaveDepense}
            disabled={loading || activeStep !== 4}
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </Box>
      </Box>

      {/* Stepper - ajusté en fonction du type de dépense */}
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
        
        {activeStep < 4 && (
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

export default DepensePage;