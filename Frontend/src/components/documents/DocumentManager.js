// components/documents/DocumentManager.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Divider, 
  Tab, Tabs, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, FormControl, InputLabel,
  Select, MenuItem, Grid, CircularProgress,
  Snackbar, Alert, Tooltip, IconButton
} from '@mui/material';
import { 
  PictureAsPdf, Email, Print, Save, 
  FileCopy, Refresh, AttachMoney, Receipt, 
  DescriptionOutlined, AddCircleOutline
} from '@mui/icons-material';
import { generateDocument, sendDocumentByEmail, DOCUMENT_TYPES } from '../../services/documentService';
import { venteService } from '../../services/venteService';

// Conversion des types de documents pour l'affichage
const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.FACTURE_TTC]: 'Facture TTC',
  [DOCUMENT_TYPES.FACTURE_HT]: 'Facture Hors Taxes',
  [DOCUMENT_TYPES.BON_LIVRAISON]: 'Bon de Livraison',
  [DOCUMENT_TYPES.FACTURE_PROFORMA]: 'Facture Proforma',
  [DOCUMENT_TYPES.AVOIR]: 'Avoir',
  [DOCUMENT_TYPES.FACTURE_RAS]: 'Facture avec Retenue à la Source',
  [DOCUMENT_TYPES.FACTURE_FODEC]: 'Facture avec FODEC'
};

// Flux de transformation possibles entre documents
const DOCUMENT_TRANSFORMATIONS = {
  [DOCUMENT_TYPES.BON_LIVRAISON]: [
    DOCUMENT_TYPES.FACTURE_TTC,
    DOCUMENT_TYPES.FACTURE_HT,
    DOCUMENT_TYPES.FACTURE_RAS,
    DOCUMENT_TYPES.FACTURE_FODEC
  ],
  [DOCUMENT_TYPES.FACTURE_PROFORMA]: [
    DOCUMENT_TYPES.FACTURE_TTC,
    DOCUMENT_TYPES.FACTURE_HT,
    DOCUMENT_TYPES.BON_LIVRAISON,
    DOCUMENT_TYPES.FACTURE_RAS,
    DOCUMENT_TYPES.FACTURE_FODEC
  ],
  [DOCUMENT_TYPES.FACTURE_TTC]: [
    DOCUMENT_TYPES.AVOIR,
    DOCUMENT_TYPES.FACTURE_RAS,
    DOCUMENT_TYPES.FACTURE_FODEC
  ],
  [DOCUMENT_TYPES.FACTURE_HT]: [
    DOCUMENT_TYPES.AVOIR,
    DOCUMENT_TYPES.FACTURE_TTC,
    DOCUMENT_TYPES.FACTURE_RAS,
    DOCUMENT_TYPES.FACTURE_FODEC
  ]
};

const DocumentManager = ({ venteId, documents = [], onDocumentGenerated }) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [documentsList, setDocumentsList] = useState(documents);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDocumentType, setNewDocumentType] = useState('');
  const [transformationOptions, setTransformationOptions] = useState({
    tauxRAS: 1.5,
    tauxFodec: 1,
    refCommande: '',
    notesComplementaires: ''
  });
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailOptions, setEmailOptions] = useState({
    destinataire: '',
    objet: '',
    message: ''
  });

  useEffect(() => {
    setDocumentsList(documents);
  }, [documents]);

  const handleTabChange = (event, newValue) => {
    setSelectedTabIndex(newValue);
  };

  const handleGenerateDocument = async (documentType, options = {}) => {
    try {
      setLoading(true);
      
      // Appel au service de génération de document
      const pdfBlob = await generateDocument(venteId, documentType, options);
      
      // Création d'un URL pour le PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Ouverture du PDF dans un nouvel onglet
      window.open(pdfUrl, '_blank');
      
      // Mise à jour de la liste des documents (à implémenter selon votre API)
      if (onDocumentGenerated) {
        onDocumentGenerated();
      }
      
      setSnackbar({
        open: true,
        message: `${DOCUMENT_TYPE_LABELS[documentType]} généré avec succès`,
        severity: 'success'
      });
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error);
      setSnackbar({
        open: true,
        message: `Erreur: ${error.message || 'Erreur de génération du document'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendByEmail = async (documentId, documentType) => {
    try {
      setLoading(true);
      
      await sendDocumentByEmail(venteId, documentType, emailOptions);
      
      setSnackbar({
        open: true,
        message: 'Document envoyé par email avec succès',
        severity: 'success'
      });
      
      setEmailDialogOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du document par email:', error);
      setSnackbar({
        open: true,
        message: `Erreur: ${error.message || 'Erreur d\'envoi du document'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransformDocument = async (sourceDoc, targetType) => {
    try {
      setLoading(true);
      let response;

      // Vérifier si la transformation est autorisée
      const allowedTransformations = DOCUMENT_TRANSFORMATIONS[sourceDoc.documentType] || [];
      if (!allowedTransformations.includes(targetType)) {
        throw new Error('Cette transformation n\'est pas autorisée');
      }

      // Effectuer la transformation appropriée
      if (sourceDoc.documentType === DOCUMENT_TYPES.FACTURE_PROFORMA && targetType === DOCUMENT_TYPES.BON_LIVRAISON) {
        response = await venteService.transformerEnBonLivraison(sourceDoc.venteId);
      } else if (sourceDoc.documentType === DOCUMENT_TYPES.BON_LIVRAISON && targetType === DOCUMENT_TYPES.FACTURE_TTC) {
        response = await venteService.transformerEnFacture(sourceDoc.venteId, transformationOptions.modePaiement);
      } else {
        throw new Error('Transformation non supportée');
      }

      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Document transformé avec succès',
          severity: 'success'
        });

        // Mettre à jour la liste des documents
        if (onDocumentGenerated) {
          onDocumentGenerated(response.data);
        }

        // Fermer le dialogue
        setDialogOpen(false);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Erreur lors de la transformation',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const openTransformationDialog = (document) => {
    setSelectedDocument(document);
    setNewDocumentType('');
    setDialogOpen(true);
  };

  const openEmailDialog = (document) => {
    setSelectedDocument(document);
    // Préremplir les champs d'email
    setEmailOptions({
      destinataire: document.destinataireEmail || '',
      objet: `${DOCUMENT_TYPE_LABELS[document.documentType]} ${document.numeroDocument || ''}`,
      message: `Cher client,\n\nVeuillez trouver ci-joint ${DOCUMENT_TYPE_LABELS[document.documentType].toLowerCase()} ${document.numeroDocument || ''} datée du ${new Date(document.dateGeneration).toLocaleDateString()}.\n\nCordialement,`
    });
    setEmailDialogOpen(true);
  };

  const renderNoDocumentsMessage = () => (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="body1" color="text.secondary">
        Aucun document n'a encore été généré pour cette vente.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddCircleOutline />}
        onClick={() => {
          setSelectedDocument(null);
          setDialogOpen(true);
        }}
        sx={{ mt: 2 }}
      >
        Créer un nouveau document
      </Button>
    </Box>
  );

  const renderDocumentsList = () => {
    const filteredDocuments = documentsList.filter(doc => {
      if (selectedTabIndex === 0) return true; // Tous les documents
      if (selectedTabIndex === 1) return doc.documentType === DOCUMENT_TYPES.FACTURE_TTC || doc.documentType === DOCUMENT_TYPES.FACTURE_HT || doc.documentType === DOCUMENT_TYPES.FACTURE_RAS || doc.documentType === DOCUMENT_TYPES.FACTURE_FODEC;
      if (selectedTabIndex === 2) return doc.documentType === DOCUMENT_TYPES.BON_LIVRAISON;
      if (selectedTabIndex === 3) return doc.documentType === DOCUMENT_TYPES.FACTURE_PROFORMA;
      if (selectedTabIndex === 4) return doc.documentType === DOCUMENT_TYPES.AVOIR;
      return false;
    });

    if (filteredDocuments.length === 0) {
      return renderNoDocumentsMessage();
    }

    return (
      <Box sx={{ mt: 2 }}>
        {filteredDocuments.map((document, index) => (
          <Paper 
            key={document._id || index} 
            elevation={2} 
            sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {DOCUMENT_TYPE_LABELS[document.documentType]} - {document.numeroDocument}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Généré le {new Date(document.dateGeneration).toLocaleDateString()} à {new Date(document.dateGeneration).toLocaleTimeString()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Voir le document">
                <IconButton color="primary" onClick={() => handleGenerateDocument(document.documentType)}>
                  <PictureAsPdf />
                </IconButton>
              </Tooltip>
              <Tooltip title="Imprimer">
                <IconButton color="default" onClick={() => window.print()}>
                  <Print />
                </IconButton>
              </Tooltip>
              <Tooltip title="Envoyer par email">
                <IconButton color="primary" onClick={() => openEmailDialog(document)}>
                  <Email />
                </IconButton>
              </Tooltip>
              <Tooltip title="Transformer en un autre document">
                <IconButton color="secondary" onClick={() => openTransformationDialog(document)}>
                  <FileCopy />
                </IconButton>
              </Tooltip>
            </Box>
          </Paper>
        ))}
      </Box>
    );
  };

  const renderCreateDocumentDialog = () => (
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        {selectedDocument 
          ? `Transformer ${DOCUMENT_TYPE_LABELS[selectedDocument.documentType]} en un autre document`
          : "Générer un nouveau document"}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="document-type-label">Type de document</InputLabel>
              <Select
                labelId="document-type-label"
                value={newDocumentType}
                onChange={(e) => setNewDocumentType(e.target.value)}
                label="Type de document"
              >
                {/* Afficher les transformations possibles basées sur le document sélectionné */}
                {selectedDocument && DOCUMENT_TRANSFORMATIONS[selectedDocument.documentType] ? (
                  DOCUMENT_TRANSFORMATIONS[selectedDocument.documentType].map((docType) => (
                    <MenuItem key={docType} value={docType}>
                      {DOCUMENT_TYPE_LABELS[docType]}
                    </MenuItem>
                  ))
                ) : (
                  // Afficher tous les types de documents si c'est une nouvelle création
                  Object.keys(DOCUMENT_TYPE_LABELS).map((docType) => (
                    <MenuItem key={docType} value={docType}>
                      {DOCUMENT_TYPE_LABELS[docType]}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* Champs spécifiques selon le type de document sélectionné */}
          {newDocumentType === DOCUMENT_TYPES.FACTURE_RAS && (
            <Grid item xs={12} md={6}>
              <TextField
                label="Taux de retenue à la source (%)"
                type="number"
                value={transformationOptions.tauxRAS}
                onChange={(e) => setTransformationOptions({ ...transformationOptions, tauxRAS: e.target.value })}
                InputProps={{ inputProps: { min: 0, max: 100, step: 0.5 } }}
                fullWidth
              />
            </Grid>
          )}

          {newDocumentType === DOCUMENT_TYPES.FACTURE_FODEC && (
            <Grid item xs={12} md={6}>
              <TextField
                label="Taux FODEC (%)"
                type="number"
                value={transformationOptions.tauxFodec}
                onChange={(e) => setTransformationOptions({ ...transformationOptions, tauxFodec: e.target.value })}
                InputProps={{ inputProps: { min: 0, max: 100, step: 0.1 } }}
                fullWidth
              />
            </Grid>
          )}

          {newDocumentType === DOCUMENT_TYPES.BON_LIVRAISON && (
            <Grid item xs={12}>
              <TextField
                label="Référence de commande"
                value={transformationOptions.refCommande}
                onChange={(e) => setTransformationOptions({ ...transformationOptions, refCommande: e.target.value })}
                fullWidth
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              label="Notes complémentaires"
              value={transformationOptions.notesComplementaires}
              onChange={(e) => setTransformationOptions({ ...transformationOptions, notesComplementaires: e.target.value })}
              multiline
              rows={4}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
        <Button 
          onClick={() => handleTransformDocument(selectedDocument, newDocumentType)}
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Transformer'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderEmailDialog = () => (
    <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Envoyer le document par email</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Destinataire"
              type="email"
              value={emailOptions.destinataire}
              onChange={(e) => setEmailOptions({ ...emailOptions, destinataire: e.target.value })}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Objet"
              value={emailOptions.objet}
              onChange={(e) => setEmailOptions({ ...emailOptions, objet: e.target.value })}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Message"
              value={emailOptions.message}
              onChange={(e) => setEmailOptions({ ...emailOptions, message: e.target.value })}
              multiline
              rows={6}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEmailDialogOpen(false)}>Annuler</Button>
        <Button 
          variant="contained" 
          color="primary"
          disabled={!emailOptions.destinataire || !emailOptions.objet || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Email />}
          onClick={() => handleSendByEmail(selectedDocument._id, selectedDocument.documentType)}
        >
          {loading ? 'Envoi...' : 'Envoyer'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Documents commerciaux</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddCircleOutline />}
          onClick={() => {
            setSelectedDocument(null); 
            setDialogOpen(true);
          }}
        >
          Nouveau document
        </Button>
      </Box>
      
      <Tabs 
        value={selectedTabIndex} 
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Tous" />
        <Tab label="Factures" />
        <Tab label="Bons de livraison" />
        <Tab label="Proforma" />
        <Tab label="Avoirs" />
      </Tabs>
      
      {renderDocumentsList()}
      {renderCreateDocumentDialog()}
      {renderEmailDialog()}
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentManager;