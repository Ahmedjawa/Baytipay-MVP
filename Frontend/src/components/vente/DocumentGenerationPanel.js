import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Grid, Divider, 
  Button, CircularProgress, Alert,
  Card, CardContent, CardActions,
  List, ListItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControl, InputLabel, Select,
  Snackbar, IconButton
} from '@mui/material';
import { 
  Receipt, Description, ReceiptLong, 
  PictureAsPdf, FileCopy, Print, Email, Download, Send,
  Visibility, Close, FullscreenExit, Fullscreen
} from '@mui/icons-material';
import { generateDocument, DOCUMENT_TYPES, sendDocumentByEmail, previewDocument } from '../../services/documentService';

/**
 * Composant pour la génération de documents dans l'étape de validation de vente
 */
const DocumentGenerationPanel = ({ venteId, venteData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(DOCUMENT_TYPES.FACTURE_TTC);
  const [emailData, setEmailData] = useState({
    destinataire: venteData?.client?.email || '',
    objet: 'Votre facture',
    message: 'Veuillez trouver ci-joint votre facture.'
  });
  const [documentOptions, setDocumentOptions] = useState({
    tauxRAS: 1.5,
    tauxFodec: 1,
    refCommande: ''
  });
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  
  // États pour la prévisualisation
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  // Génère un document selon le type sélectionné
  const handleGenerateDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!venteId) {
        throw new Error('ID de vente manquant. Veuillez d\'abord enregistrer la vente.');
      }
      
      // Générer le document avec le service
      const pdfBlob = await generateDocument(venteId, selectedDocumentType, documentOptions);
      
      // Créer URL et simuler un téléchargement
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      
      // Déterminer le nom du fichier selon le type de document
      let fileName = getDocumentFileName(venteId, selectedDocumentType);
      
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Mettre à jour les documents
      const newDocument = {
        type: selectedDocumentType,
        dateGeneration: new Date().toISOString(),
        fileName
      };
      
      setDocuments([...documents, newDocument]);
      setSuccess(`Le document a été généré avec succès`);
      
      // Réinitialiser après 3 secondes
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error);
      setError(error.message || 'Erreur lors de la génération du document');
    } finally {
      setLoading(false);
    }
  };

  // Prévisualiser le document
  const handlePreviewDocument = async () => {
    try {
      setPreviewLoading(true);
      setError(null);
      
      if (!venteId) {
        throw new Error('ID de vente manquant. Veuillez d\'abord enregistrer la vente.');
      }
      
      // Appel au service de prévisualisation
      const pdfBlob = await previewDocument(venteId, selectedDocumentType, documentOptions);
      
      // Créer URL pour la prévisualisation
      const url = URL.createObjectURL(pdfBlob);
      setPreviewUrl(url);
      setPreviewDialogOpen(true);
      
    } catch (error) {
      console.error('Erreur lors de la prévisualisation du document:', error);
      setError(error.message || 'Erreur lors de la prévisualisation du document');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Fermer la prévisualisation et nettoyer l'URL
  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewDialogOpen(false);
    setPreviewFullscreen(false);
  };

  // Obtenir le nom de fichier selon le type de document
  const getDocumentFileName = (venteId, documentType) => {
    switch (documentType) {
      case DOCUMENT_TYPES.FACTURE_TTC:
        return `Facture_${venteId}.pdf`;
      case DOCUMENT_TYPES.FACTURE_HT:
        return `FactureHT_${venteId}.pdf`;
      case DOCUMENT_TYPES.BON_LIVRAISON:
        return `BonLivraison_${venteId}.pdf`;
      case DOCUMENT_TYPES.FACTURE_PROFORMA:
        return `Proforma_${venteId}.pdf`;
      case DOCUMENT_TYPES.AVOIR:
        return `Avoir_${venteId}.pdf`;
      case DOCUMENT_TYPES.FACTURE_RAS:
        return `FactureRAS_${venteId}.pdf`;
      case DOCUMENT_TYPES.FACTURE_FODEC:
        return `FactureFODEC_${venteId}.pdf`;
      default:
        return `Document_${documentType}_${venteId}.pdf`;
    }
  };

  // Ouvre la boîte de dialogue d'options pour certains types de documents
  const handleSelectDocumentType = (type) => {
    setSelectedDocumentType(type);
    
    // Ouvrir le dialogue d'options pour les documents spécifiques
    if (type === DOCUMENT_TYPES.FACTURE_RAS || 
        type === DOCUMENT_TYPES.FACTURE_FODEC || 
        type === DOCUMENT_TYPES.BON_LIVRAISON) {
      setOptionsDialogOpen(true);
    }
  };

  // Gère l'envoi par email
  const handleSendEmail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!venteId) {
        throw new Error('ID de vente manquant.');
      }
      
      await sendDocumentByEmail(venteId, selectedDocumentType, {
        email: emailData.destinataire,
        subject: emailData.objet,
        message: emailData.message
      });
      
      setEmailDialogOpen(false);
      setSuccess('Email envoyé avec succès');
      
      // Réinitialiser après 3 secondes
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      setError(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  // Rendu des cartes de document
  const renderDocumentCards = () => {
    const documentTypes = [
      { id: DOCUMENT_TYPES.FACTURE_TTC, title: 'Facture TTC', icon: <Receipt /> },
      { id: DOCUMENT_TYPES.FACTURE_HT, title: 'Facture HT', icon: <Receipt /> },
      { id: DOCUMENT_TYPES.BON_LIVRAISON, title: 'Bon de livraison', icon: <ReceiptLong /> },
      { id: DOCUMENT_TYPES.FACTURE_PROFORMA, title: 'Facture Proforma', icon: <Description /> },
      { id: DOCUMENT_TYPES.FACTURE_RAS, title: 'Facture RAS', icon: <Receipt /> },
      { id: DOCUMENT_TYPES.FACTURE_FODEC, title: 'Facture FODEC', icon: <Receipt /> },
      { id: DOCUMENT_TYPES.AVOIR, title: 'Avoir', icon: <Receipt /> }
    ];

    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {documentTypes.map((docType) => (
          <Grid item xs={12} sm={6} md={4} key={docType.id}>
            <Card 
              variant="outlined"
              sx={{ 
                borderColor: selectedDocumentType === docType.id ? 'primary.main' : 'divider',
                boxShadow: selectedDocumentType === docType.id ? 1 : 0
              }}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {docType.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {docType.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {getDocumentDescription(docType.id)}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary"
                  onClick={() => handleSelectDocumentType(docType.id)}
                >
                  Sélectionner
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Description des différents types de documents
  const getDocumentDescription = (type) => {
    switch (type) {
      case DOCUMENT_TYPES.FACTURE_TTC:
        return 'Facture standard incluant la TVA pour vos clients';
      case DOCUMENT_TYPES.FACTURE_HT:
        return 'Facture hors taxes (sans TVA incluse)';
      case DOCUMENT_TYPES.BON_LIVRAISON:
        return 'Document accompagnant la livraison des produits';
      case DOCUMENT_TYPES.FACTURE_PROFORMA:
        return 'Devis préalable avant facturation définitive';
      case DOCUMENT_TYPES.AVOIR:
        return 'Document de crédit pour un remboursement ou correction';
      case DOCUMENT_TYPES.FACTURE_RAS:
        return 'Facture avec retenue à la source selon la législation';
      case DOCUMENT_TYPES.FACTURE_FODEC:
        return 'Facture incluant le Fond de Développement de la Compétitivité';
      default:
        return 'Document commercial';
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Génération de documents
      </Typography>
      
      {/* Affichage des messages d'erreur/succès */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {/* Sélection du type de document */}
      {renderDocumentCards()}
      
      {/* Actions disponibles */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={previewLoading ? <CircularProgress size={20} /> : <Visibility />}
          onClick={handlePreviewDocument}
          disabled={previewLoading || loading || !selectedDocumentType}
        >
          {previewLoading ? 'Chargement...' : 'Prévisualiser'}
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} /> : <Download />}
          onClick={handleGenerateDocument}
          disabled={loading || !selectedDocumentType}
        >
          {loading ? 'Génération...' : 'Générer et télécharger'}
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Email />}
          onClick={() => setEmailDialogOpen(true)}
          disabled={loading || !selectedDocumentType}
        >
          Envoyer par email
        </Button>
      </Box>
      
      {/* Liste des documents générés */}
      {documents.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Documents générés
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <List>
              {documents.map((doc, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <PictureAsPdf />
                  </ListItemIcon>
                  <ListItemText 
                    primary={doc.fileName} 
                    secondary={`Généré le ${new Date(doc.dateGeneration).toLocaleString()}`} 
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      )}
      
      {/* Dialogue d'options pour documents spécifiques */}
      <Dialog 
        open={optionsDialogOpen} 
        onClose={() => setOptionsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Options pour {getDocumentTitle(selectedDocumentType)}</DialogTitle>
        <DialogContent>
          {selectedDocumentType === DOCUMENT_TYPES.FACTURE_RAS && (
            <TextField
              label="Taux de retenue à la source (%)"
              type="number"
              value={documentOptions.tauxRAS}
              onChange={(e) => setDocumentOptions({...documentOptions, tauxRAS: parseFloat(e.target.value)})}
              fullWidth
              margin="normal"
              InputProps={{ inputProps: { min: 0, max: 100, step: 0.1 } }}
              helperText="Taux standard: 1.5%"
            />
          )}
          
          {selectedDocumentType === DOCUMENT_TYPES.FACTURE_FODEC && (
            <TextField
              label="Taux FODEC (%)"
              type="number"
              value={documentOptions.tauxFodec}
              onChange={(e) => setDocumentOptions({...documentOptions, tauxFodec: parseFloat(e.target.value)})}
              fullWidth
              margin="normal"
              InputProps={{ inputProps: { min: 0, max: 100, step: 0.1 } }}
              helperText="Taux standard: 1%"
            />
          )}
          
          {selectedDocumentType === DOCUMENT_TYPES.BON_LIVRAISON && (
            <TextField
              label="Référence de commande"
              value={documentOptions.refCommande}
              onChange={(e) => setDocumentOptions({...documentOptions, refCommande: e.target.value})}
              fullWidth
              margin="normal"
              helperText="Numéro de commande client (optionnel)"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOptionsDialogOpen(false)}>Annuler</Button>
          <Button onClick={() => setOptionsDialogOpen(false)} color="primary">Confirmer</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue d'envoi par email */}
      <Dialog 
        open={emailDialogOpen} 
        onClose={() => setEmailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Envoyer par email</DialogTitle>
        <DialogContent>
          <TextField
            label="Destinataire"
            value={emailData.destinataire}
            onChange={(e) => setEmailData({...emailData, destinataire: e.target.value})}
            fullWidth
            margin="normal"
            type="email"
          />
          <TextField
            label="Objet"
            value={emailData.objet}
            onChange={(e) => setEmailData({...emailData, objet: e.target.value})}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Message"
            value={emailData.message}
            onChange={(e) => setEmailData({...emailData, message: e.target.value})}
            fullWidth
            margin="normal"
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Annuler</Button>
          <Button 
            onClick={handleSendEmail} 
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            {loading ? 'Envoi...' : 'Envoyer'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue de prévisualisation du document */}
      <Dialog 
        open={previewDialogOpen} 
        onClose={handleClosePreview}
        maxWidth={previewFullscreen ? false : "md"}
        fullWidth
        fullScreen={previewFullscreen}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0',
          m: 0,
          p: 2
        }}>
          <Typography variant="h6">
            Prévisualisation - {getDocumentTitle(selectedDocumentType)}
          </Typography>
          <Box>
            <IconButton 
              onClick={() => setPreviewFullscreen(!previewFullscreen)}
              size="small"
            >
              {previewFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
            <IconButton 
              onClick={handleClosePreview}
              size="small"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          p: 0, 
          height: previewFullscreen ? 'calc(100vh - 64px)' : '80vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {previewUrl && (
            <Box sx={{ flexGrow: 1, height: '100%', overflow: 'hidden' }}>
              <iframe
                src={`${previewUrl}#toolbar=0&navpanes=0`}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none',
                  overflow: 'hidden'
                }}
                title="Prévisualisation du document"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e0e0e0', justifyContent: 'space-between', p: 2 }}>
          <Button 
            onClick={handleClosePreview}
            variant="outlined"
          >
            Fermer
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Download />}
              onClick={handleGenerateDocument}
              disabled={loading}
            >
              Télécharger
            </Button>
            <Button
              variant="outlined"
              startIcon={<Email />}
              onClick={() => {
                handleClosePreview();
                setEmailDialogOpen(true);
              }}
            >
              Envoyer par email
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Aide à déterminer le titre du document sélectionné
const getDocumentTitle = (documentType) => {
  switch (documentType) {
    case DOCUMENT_TYPES.FACTURE_TTC:
      return 'Facture TTC';
    case DOCUMENT_TYPES.FACTURE_HT:
      return 'Facture Hors Taxes';
    case DOCUMENT_TYPES.BON_LIVRAISON:
      return 'Bon de Livraison';
    case DOCUMENT_TYPES.FACTURE_PROFORMA:
      return 'Facture Proforma';
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

export default DocumentGenerationPanel;