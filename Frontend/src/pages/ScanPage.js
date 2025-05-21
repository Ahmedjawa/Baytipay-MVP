// client/src/pages/ScanPage.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Stepper, 
  Step, 
  StepLabel, 
  Grid,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Divider,
  Alert
} from '@mui/material';
import {
  Camera as CameraIcon,
  PhotoCamera as PhotoCameraIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CropRotate as CropRotateIcon,
  BrightnessHigh as BrightnessIcon,
  Contrast as ContrastIcon,
  AddCircleOutline as AddIcon
} from '@mui/icons-material';
import apiClient from '../utils/apiClient';
import ocrService from '../utils/ocrService';
import ocrDataMapper from '../utils/ocrDataMapper';

const steps = ['Capture du document', 'Traitement et analyse', 'Validation et actions'];

export default function ScanPage() {
  // État pour suivre l'étape actuelle du processus
  const [activeStep, setActiveStep] = useState(0);
  
  // États pour la capture et le traitement de l'image
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [cameraError, setCameraError] = useState(null);
  
  // États pour les données extraites
  const [extractedData, setExtractedData] = useState({
    title: '',
    date: '',
    amount: '',
    tax: '',
    totalAmount: '',
    vendor: '',
    category: '',
    reference: '',
    details: ''
  });
  
  // Référence à l'élément vidéo pour la caméra
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  // Options pour les catégories et les tiers
  const [categories, setCategories] = useState([
    'Achat', 'Vente', 'Dépense', 'Facture', 'Reçu', 'Autre'
  ]);
  
  const [tiers, setTiers] = useState([
    { id: 1, name: 'Fournisseur A' },
    { id: 2, name: 'Client B' },
    { id: 3, name: 'Prestataire C' }
  ]);
  
  // Options pour les actions à effectuer
  const [selectedAction, setSelectedAction] = useState('');
  const actionOptions = [
    { value: 'transaction', label: 'Créer une transaction' },
    { value: 'echeancier', label: 'Ajouter à un échéancier' },
    { value: 'justificatif', label: 'Enregistrer comme justificatif' },
    { value: 'tiers', label: 'Associer à un tiers' },
  ];
  
  // Activez la caméra lorsque le composant est monté
  useEffect(() => {
    if (activeStep === 0 && !imageSrc) {
      handleStartCamera();
    }
    
    // Nettoyage: arrêtez la caméra lorsque le composant est démonté
    return () => {
      if (cameraActive && videoRef.current) {
        const stream = videoRef.current.srcObject;
        if (stream) {
          const tracks = stream.getTracks();
          tracks.forEach(track => track.stop());
        }
      }
    };
  }, [activeStep, imageSrc]);

  // Simuler le progrès de traitement
  useEffect(() => {
    if (activeStep === 1 && isLoading) {
      const timer = setInterval(() => {
        setProcessingProgress((prevProgress) => {
          const newProgress = prevProgress + 10;
          if (newProgress >= 100) {
            clearInterval(timer);
            setTimeout(() => {
              // Utiliser le service OCR pour traiter l'image
              processImageWithOCR(imageSrc);
            }, 500);
          }
          return newProgress;
        });
      }, 300);
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [activeStep, isLoading]);
  
  // Traitement OCR de l'image
  const processImageWithOCR = async (imageData) => {
  try {
    setIsLoading(true);
    setProcessingProgress(0);
    
    // Prétraitement et OCR
    const ocrResponse = await ocrService.processImage(imageData, {
      brightness: brightness - 100,
      contrast: contrast - 100
    });
    
    console.log("Réponse OCR brute:", ocrResponse);
    
    // Vérification du format des entités
    if (ocrResponse.entities) {
      console.log("Toutes les entités:", JSON.stringify(ocrResponse.entities, null, 2));
      // Forcer le format attendu par le mapper
      Object.keys(ocrResponse.entities).forEach(key => {
        const value = ocrResponse.entities[key];
        // Si l'entité n'est pas un tableau, la convertir
        if (!Array.isArray(value)) {
          console.log(`L'entité ${key} n'est pas un tableau, conversion...`);
          if (typeof value === 'object' && value !== null) {
            // Si c'est un objet, le convertir en tableau d'objets
            ocrResponse.entities[key] = [value];
          } else {
            // Si c'est une valeur simple, créer un objet avec les propriétés attendues
            ocrResponse.entities[key] = [{
              value: String(value),
              confidence: 0.85
            }];
          }
        } else if (value.length > 0 && !value[0].hasOwnProperty('value')) {
          // Si c'est un tableau mais sans la propriété 'value'
          ocrResponse.entities[key] = value.map(item => ({
            value: typeof item === 'object' ? JSON.stringify(item) : String(item),
            confidence: 0.85
          }));
        }
        console.log(`Entité ${key} après conversion:`, ocrResponse.entities[key]);
      });
    } else {
      console.warn("Aucune entité trouvée dans la réponse OCR");
      ocrResponse.entities = {};
    }
    
    // Détecter le type de document si ce n'est pas déjà fait
    let documentType = {};
    if (ocrResponse.text) {
      try {
        documentType = await ocrService.detectDocumentType(ocrResponse.text);
      } catch (error) {
        console.warn("Erreur lors de la détection du type de document:", error);
      }
    }
    
    // Utiliser le mapper pour convertir les données OCR au format attendu par le formulaire
    const mappedData = ocrDataMapper.mapOcrResponseToFormData(ocrResponse);
    
    console.log("Données mappées finales:", mappedData);
    
    // Mettre à jour l'état avec les données extraites
    setExtractedData({
      ...mappedData,
      documentType: documentType.type || ''
    });
    
    setActiveStep(2);
  } catch (error) {
    console.error('Erreur lors du traitement OCR:', error);
    alert('Erreur lors du traitement de l\'image. Veuillez réessayer.');
  } finally {
    setIsLoading(false);
  }
};
  
  // Fonctions pour gérer la caméra
  const handleStartCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (error) {
      setCameraError('Impossible d\'accéder à la caméra. Vérifiez que vous avez accordé les permissions.');
      setCameraActive(false);
    }
  };
  
  const handleStopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };
  
  // Capturer une image de la caméra
  const handleCapture = async () => {
    try {
      if (!videoRef.current) return;
      
      // Créer un canvas pour capturer l'image
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      // Ajuster la taille du canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Capturer l'image
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/png');
      setImageSrc(imageData);
      setActiveStep(1);
      
      // Démarrer le traitement OCR
      await processImageWithOCR(imageData);
    } catch (error) {
      console.error('Erreur lors de la capture:', error);
      alert('Erreur lors de la capture de l\'image');
    }
  };
  
  // Télécharger une image depuis l'appareil
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Gérer les étapes du stepper
  const handleNext = () => {
    if (activeStep === 0 && imageSrc) {
      setIsLoading(true);
      setActiveStep(1);
    } else if (activeStep === 2) {
      // Soumettre les données finales
      handleSubmitFinalData();
    }
  };
  
  const handleBack = () => {
    if (activeStep === 1) {
      setIsLoading(false);
      setProcessingProgress(0);
    }
    
    if (activeStep === 2) {
      // Revenir à l'étape de capture
      setExtractedData({
        title: '',
        date: '',
        amount: '',
        tax: '',
        totalAmount: '',
        vendor: '',
        category: '',
        reference: '',
        details: ''
      });
    }
    
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleReset = () => {
    setActiveStep(0);
    setImageSrc(null);
    setIsLoading(false);
    setProcessingProgress(0);
    setExtractedData({
      title: '',
      date: '',
      amount: '',
      tax: '',
      totalAmount: '',
      vendor: '',
      category: '',
      reference: '',
      details: ''
    });
    setSelectedAction('');
    handleStartCamera();
  };
  
  // Gérer les ajustements d'image
  const handleOpenAdjustments = () => {
    setAdjustmentsOpen(true);
  };
  
  const handleCloseAdjustments = () => {
    setAdjustmentsOpen(false);
  };
  
  // Gérer la soumission finale des données
  const handleSubmitFinalData = async () => {
    if (!selectedAction) {
      alert("Veuillez sélectionner une action à effectuer");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Préparer les données à envoyer
      const documentData = {
        title: extractedData.title,
        date: extractedData.date,
        amount: parseFloat(extractedData.amount) || 0,
        tax: parseFloat(extractedData.tax) || 0,
        totalAmount: parseFloat(extractedData.totalAmount) || 0,
        vendor: extractedData.vendor,
        category: extractedData.category,
        reference: extractedData.reference,
        details: extractedData.details,
        imageData: imageSrc,
        actionType: selectedAction
      };
      
      // Enregistrer le document
      await ocrService.saveDocument(documentData);
      
      // Afficher une confirmation de réussite
      alert("Document traité avec succès!");
      
      // Rediriger en fonction de l'action sélectionnée
      if (selectedAction === 'transaction') {
        // Préparer les données pour une nouvelle transaction et rediriger
        const transactionData = {
          type: extractedData.category === 'Vente' ? 'credit' : 'debit',
          amount: documentData.totalAmount,
          date: documentData.date,
          description: documentData.title,
          reference: documentData.reference,
          tierId: await getVendorId(extractedData.vendor)
        };
        
        // Option: stocker les données dans sessionStorage pour les récupérer sur la page de transaction
        sessionStorage.setItem('newTransactionData', JSON.stringify(transactionData));
        
        // Rediriger vers la page transaction avec les données préremplies
        // navigate('/transactions/new');
      }
      
      // Réinitialiser le processus
      handleReset();
    } catch (error) {
      console.error("Erreur lors de la soumission des données:", error);
      alert("Une erreur est survenue lors de l'enregistrement du document. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Récupérer l'ID d'un tiers à partir de son nom
  const getVendorId = async (vendorName) => {
    try {
      const response = await apiClient.get('/api/tiers/search', {
        params: {
          q: vendorName
        }
      });
      
      // Si un seul résultat est trouvé, retourner son ID
      if (response.data && response.data.length === 1) {
        return response.data[0]._id;
      }
      
      // Si plusieurs résultats, retourner null (à implémenter : affichage d'une liste de sélection)
      return null;
    } catch (error) {
      console.error('Erreur lors de la recherche du tiers:', error);
      return null;
    }
  };
  
  // Composant pour l'étape de capture
  const CaptureStep = () => (
    <Box sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 2, 
              height: 400, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {!imageSrc ? (
              <>
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <video 
                    ref={videoRef} 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%',
                      display: cameraActive ? 'block' : 'none'
                    }}
                    autoPlay 
                    playsInline
                  />
                  {!cameraActive && (
                    <Typography variant="body1" color="text.secondary">
                      Cliquez sur "Activer la caméra" ou "Importer une image"
                    </Typography>
                  )}
                  {cameraError && (
                    <Typography variant="body1" color="error.main">
                      {cameraError}
                    </Typography>
                  )}
                </Box>
                
                {/* Cadre de positionnement */}
                {cameraActive && (
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      border: '2px dashed #40E0D0',
                      width: '80%',
                      height: '70%',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  />
                )}
              </>
            ) : (
              <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                <img 
                  src={imageSrc} 
                  alt="Document capturé" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%',
                    objectFit: 'contain',
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`
                  }}
                />
              </Box>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </Paper>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
            {!imageSrc ? (
              <>
                <Button 
                  variant="contained" 
                  startIcon={<CameraIcon />}
                  onClick={handleStartCamera}
                  disabled={cameraActive}
                >
                  Activer la caméra
                </Button>
                <Button 
                  variant="outlined" 
                  component="label"
                >
                  Importer une image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outlined" 
                  startIcon={<CropRotateIcon />}
                  onClick={handleOpenAdjustments}
                >
                  Ajuster
                </Button>
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<CancelIcon />}
                  onClick={handleReset}
                >
                  Annuler
                </Button>
              </>
            )}
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Instructions:
            </Typography>
            <Typography variant="body1" paragraph>
              1. Placez votre document dans le cadre.
            </Typography>
            <Typography variant="body1" paragraph>
              2. Assurez-vous que le document est bien éclairé et que le texte est lisible.
            </Typography>
            <Typography variant="body1" paragraph>
              3. Évitez les reflets et les ombres sur le document.
            </Typography>
            <Typography variant="body1" paragraph>
              4. Capturez l'image ou importez-la depuis votre appareil.
            </Typography>
            <Typography variant="body1">
              5. Ajustez l'image si nécessaire avant de procéder à l'analyse.
            </Typography>
            
            {cameraActive && (
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  size="large"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleCapture}
                >
                  Capturer
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Dialog pour les ajustements d'image */}
      <Dialog open={adjustmentsOpen} onClose={handleCloseAdjustments}>
        <DialogTitle>Ajuster l'image</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Luminosité</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BrightnessIcon sx={{ mr: 1 }} />
            <Slider
              value={brightness}
              min={50}
              max={150}
              step={1}
              onChange={(e, newValue) => setBrightness(newValue)}
              valueLabelDisplay="auto"
            />
          </Box>
          
          <Typography gutterBottom sx={{ mt: 2 }}>Contraste</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ContrastIcon sx={{ mr: 1 }} />
            <Slider
              value={contrast}
              min={50}
              max={150}
              step={1}
              onChange={(e, newValue) => setContrast(newValue)}
              valueLabelDisplay="auto"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdjustments}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
  
  // Composant pour l'étape de traitement
  const ProcessingStep = () => (
    <Box sx={{ mt: 4, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Analyse du document en cours...
      </Typography>
      <Box sx={{ width: '100%', mt: 4, mb: 2 }}>
        <LinearProgress variant="determinate" value={processingProgress} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {processingProgress}% Complété
        </Typography>
      </Box>
      
      <Box sx={{ mt: 4 }}>
        {processingProgress >= 30 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Détection du type de document...
          </Alert>
        )}
        {processingProgress >= 50 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Extraction du texte...
          </Alert>
        )}
        {processingProgress >= 70 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Analyse des montants et dates...
          </Alert>
        )}
        {processingProgress >= 90 && (
          <Alert severity="success">
            Analyse terminée, préparation des résultats...
          </Alert>
        )}
      </Box>
    </Box>
  );
  
  // Composant pour l'étape de validation
  const ValidationStep = () => (
    <Box sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Données extraites
            </Typography>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Titre"
                value={extractedData.title}
                onChange={(e) => setExtractedData({...extractedData, title: e.target.value})}
                margin="normal"
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={extractedData.date}
                    onChange={(e) => setExtractedData({...extractedData, date: e.target.value})}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Référence"
                    value={extractedData.reference}
                    onChange={(e) => setExtractedData({...extractedData, reference: e.target.value})}
                    margin="normal"
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Montant HT"
                    value={extractedData.amount}
                    onChange={(e) => setExtractedData({...extractedData, amount: e.target.value})}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="TVA"
                    value={extractedData.tax}
                    onChange={(e) => setExtractedData({...extractedData, tax: e.target.value})}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    label="Montant TTC"
                    value={extractedData.totalAmount}
                    onChange={(e) => setExtractedData({...extractedData, totalAmount: e.target.value})}
                    margin="normal"
                  />
                </Grid>
              </Grid>
              <FormControl fullWidth margin="normal">
                <InputLabel>Fournisseur/Client</InputLabel>
                <Select
                  value={extractedData.vendor}
                  onChange={(e) => setExtractedData({...extractedData, vendor: e.target.value})}
                >
                  {tiers.map((tier) => (
                    <MenuItem key={tier.id} value={tier.name}>
                      {tier.name}
                    </MenuItem>
                  ))}
                  <MenuItem value="autre">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AddIcon fontSize="small" sx={{ mr: 1 }} />
                      Ajouter un nouveau
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={extractedData.category}
                  onChange={(e) => setExtractedData({...extractedData, category: e.target.value})}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Détails"
                multiline
                rows={3}
                value={extractedData.details}
                onChange={(e) => setExtractedData({...extractedData, details: e.target.value})}
                margin="normal"
              />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Document numérisé
            </Typography>
            <Box 
              sx={{ 
                mt: 2, 
                height: 200, 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {imageSrc && (
                <img 
                  src={imageSrc} 
                  alt="Document numérisé" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              )}
            </Box>
          </Paper>
          
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Action à effectuer
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Choisir une action</InputLabel>
              <Select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
              >
                {actionOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedAction && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  {selectedAction === 'transaction' && "Cette action créera une nouvelle transaction basée sur le document."}
                  {selectedAction === 'echeancier' && "Cette action ajoutera le montant à un échéancier existant."}
                  {selectedAction === 'justificatif' && "Cette action enregistrera le document comme justificatif."}
                  {selectedAction === 'tiers' && "Cette action associera le document au tiers sélectionné."}
                </Alert>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
  
  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Scan et traitement de documents
      </Typography>
      <Divider sx={{ mb: 4 }} />
      
      {/* Stepper pour suivre le processus */}
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {/* Contenu de l'étape active */}
      {activeStep === 0 && <CaptureStep />}
      {activeStep === 1 && <ProcessingStep />}
      {activeStep === 2 && <ValidationStep />}
      
      {/* Navigation entre les étapes */}
      <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4 }}>
        <Button
          variant="outlined"
          disabled={activeStep === 0 || isLoading}
          onClick={handleBack}
          sx={{ mr: 1 }}
        >
          Retour
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button 
          variant="contained" 
          onClick={handleNext}
          disabled={(activeStep === 0 && !imageSrc) || isLoading}
        >
          {activeStep === steps.length - 1 ? 'Terminer' : 'Suivant'}
        </Button>
      </Box>
    </Box>
  );
}