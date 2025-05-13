import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stepper, Step, StepLabel, Paper, Button, 
  Container, CircularProgress, Snackbar, Alert, Card, Divider,
  Grid, TextField, Autocomplete, IconButton, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Add, ArrowBack, ArrowForward, Save, Print, Email, CheckCircle,
  Remove, Add as AddIcon, Delete, Edit, Search, CalendarMonth,
  Receipt, Money, CreditCard, ReceiptLong, Description, Send
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import config from '../config';
// Import des composants des étapes de vente
import ClientStep from '../components/vente/ClientStep';
import ArticlesStep from '../components/vente/ArticlesStep';
import PaiementStep from '../components/vente/PaiementStep';
import EcheancierStep from '../components/vente/EcheancierStep';
import ValidationStep from '../components/vente/RecapitulatifStep';
import { createVente } from '../services/venteService';





function VentePage() {
  const navigate = useNavigate();
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
    documents: []
  });
  const [echeancierDialogOpen, setEcheancierDialogOpen] = useState(false);
  
  // Define the steps for the Stepper component according to the specified flow
  const steps = ['Client', 'Articles/Services', 'Paiement', 'Échéancier', 'Validation et Documents'];

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [clientsResponse, articlesResponse] = await Promise.all([
          apiClient.get('api/clients'),
          apiClient.get('api/articles')
        ]);
        setClients(clientsResponse.data);
        setArticles(articlesResponse.data);
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
    // Validation for Client step
    if (activeStep === 0 && !venteData.client) {
      setSnackbar({
        open: true,
        message: 'Veuillez sélectionner un client',
        severity: 'error'
      });
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
    if (activeStep === 2 && 
        !(venteData.modePaiement === 'cheques_multiples' || 
          venteData.modePaiement === 'effets_multiples' || 
          venteData.modePaiement === 'mixte')) {
      setActiveStep((prevStep) => prevStep + 2); // Skip to validation step
      return;
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
    
    // Move to next step
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    // Special handling for going back from validation step when échéancier is not applicable
    if (activeStep === 4 && 
        !(venteData.modePaiement === 'cheques_multiples' || 
          venteData.modePaiement === 'effets_multiples' || 
          venteData.modePaiement === 'mixte')) {
      setActiveStep(2); // Go back to payment step
      return;
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

  const handleSaveVente = async () => {
  try {
    setLoading(true);
    
    // Get user and enterprise IDs from localStorage
    const entrepriseId = localStorage.getItem('entrepriseId');
    const userId = localStorage.getItem('userId');
    
    if (!entrepriseId || !userId) {
      throw new Error("Identifiants non trouvés. Veuillez vous reconnecter.");
    }
    
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
    
    // Use the service to create the sale
    await createVente(venteData, { entrepriseId, userId });
    
    // Show success message
    setSnackbar({
      open: true,
      message: 'Vente enregistrée avec succès',
      severity: 'success'
    });
    
    // Redirect to sales list after a short delay
    setTimeout(() => {
      navigate('/ventes');
    }, 2000);
    
  } catch (error) {
    console.error("Erreur lors de l'enregistrement:", error);
    
    // Display a more helpful error message
    setSnackbar({
      open: true,
      message: error.response?.data?.message || error.message || "Erreur lors de l'enregistrement",
      severity: 'error'
    });
  } finally {
    setLoading(false);
  }
};
  const handleImprimerFacture = () => {
    // TODO: Implémenter la logique d'impression de facture
    console.log('Impression de la facture');
    setSnackbar({
      open: true,
      message: 'Impression de la facture en cours...',
      severity: 'info'
    });
  };

  const handleEnvoyerParEmail = () => {
    // TODO: Implémenter la logique d'envoi par email
    console.log('Envoi par email');
    setSnackbar({
      open: true,
      message: 'Préparation de l\'envoi par email...',
      severity: 'info'
    });
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return <ClientStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 1:
        return <ArticlesStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 2:
        return <PaiementStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 3:
        return <EcheancierStep venteData={venteData} updateVenteData={handleDataChange} />;
      case 4:
        return <ValidationStep 
          venteData={venteData} 
          updateVenteData={handleDataChange} 
          onImprimer={handleImprimerFacture}
          onEnvoyer={handleEnvoyerParEmail}
        />;
      default:
        return 'Étape inconnue';
    }
  };

  // Determine if current step should be shown based on payment method
  const shouldShowEcheancierStep = () => {
    return venteData.modePaiement === 'cheques_multiples' || 
           venteData.modePaiement === 'effets_multiples' || 
           venteData.modePaiement === 'mixte';
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

  return (
    <Box>
      {/* En-tête avec titre */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Nouvelle Vente</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep === 4 && (
            <>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Print />}
                onClick={handleImprimerFacture}
              >
                Imprimer
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Email />}
                onClick={handleEnvoyerParEmail}
              >
                Envoyer
              </Button>
            </>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveVente}
            disabled={loading || activeStep !== 4}
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </Box>
      </Box>

      {/* Stepper - adjusted based on payment method */}
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
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
            disabled={loading}
            endIcon={<ArrowForward />}
          >
            {activeStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
          </Button>
        )}
      </Box>

      {/* Snackbar */}
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

export default VentePage;