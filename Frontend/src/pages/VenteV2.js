import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stepper, Step, StepLabel, Paper, Button, 
  Container, CircularProgress, Snackbar, Alert, Card, Divider,
  Grid, TextField, Autocomplete, IconButton, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Menu, MenuItem
} from '@mui/material';
import { 
  Add, ArrowBack, ArrowForward, Save, Print, Email, CheckCircle,
  Remove, Add as AddIcon, Delete, Edit, Search, CalendarMonth,
  Receipt, Money, CreditCard, ReceiptLong, Description, Send,
  ArrowDropDown, Close, Download
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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

import DocumentGenerationPanel from '../components/vente/DocumentGenerationPanel';

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
  const [printMenuAnchor, setPrintMenuAnchor] = useState(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  
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

  const handleSaveVente = async (preventRedirect) => {
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

      let result;
      
      if (venteData.id) {
        // Mise à jour d'une vente existante
        result = await updateVente(venteData.id, venteData, { entrepriseId, userId });
      } else {
        // Création d'une nouvelle vente
        result = await createVente(venteData, { entrepriseId, userId });
      }
      
      // Mettre à jour l'ID de la vente dans le state
      if (result.success && result.data.vente) {
        setVenteData(prev => ({ ...prev, id: result.data.vente._id }));
      }
      
      setSnackbar({ open: true, message: 'Vente enregistrée', severity: 'success' });

      // Redirection conditionnelle
      if (!preventRedirect) {
        setTimeout(() => navigate('/ventes'), 2000);
      }

      return result;
      
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      
      // Display a more helpful error message
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
      targetVenteId = await handleSaveVente(true); // Empêcher la redirection
      
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

  return (
    <Box>
      {/* En-tête avec titre */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Nouvelle Vente</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep === 4 && (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Print />}
                endIcon={<ArrowDropDown />}
                onClick={handlePrintMenuOpen}
                disabled={loading || documentPreviewLoading}
              >
                Imprimer
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveVente}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Menu pour le choix du type de document */}
      <Menu 
        anchorEl={printMenuAnchor} 
        open={Boolean(printMenuAnchor)} 
        onClose={handlePrintMenuClose}
      >
        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.FACTURE_TTC)}>Facture TTC</MenuItem>
        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.FACTURE_HT)}>Facture Hors Taxes</MenuItem>
        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.BON_LIVRAISON)}>Bon de Livraison</MenuItem>
        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.AVOIR)}>Avoir</MenuItem>
        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.FACTURE_RAS)}>Facture avec Retenue à la Source</MenuItem>
        <MenuItem onClick={() => handleImprimerFacture(DOCUMENT_TYPES.FACTURE_FODEC)}>Facture avec FODEC</MenuItem>
      </Menu>

      {/* Dialogue de prévisualisation */}
      <Dialog 
        open={previewDialogOpen} 
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <Typography variant="h6">
            Prévisualisation - {getDocumentTitle(selectedDocumentType)}
          </Typography>
          <IconButton onClick={handleClosePreview}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '80vh' }}>
          {previewUrl && (
            <iframe
              src={previewUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Prévisualisation du document"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
  <Button onClick={handleClosePreview} variant="outlined">
    Fermer
  </Button>
  <Box sx={{ display: 'flex', gap: 2 }}>
    <Button
      variant="contained"
      color="primary"
      startIcon={<Download />}
      onClick={handleDownloadDocument}
      disabled={loading}
    >
      Télécharger
    </Button>
    <Button
      variant="outlined"
      startIcon={<Email />}
      onClick={() => handleEnvoyerParEmail(selectedDocumentType)}
    >
      Envoyer par email
    </Button>
    <Button
      variant="contained"
      startIcon={<Print />}
      onClick={() => {
        const iframe = document.querySelector('iframe[title="Prévisualisation du document"]');
        iframe?.contentWindow?.print();
      }}
    >
      Imprimer
    </Button>
  </Box>
</DialogActions>
      </Dialog>

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