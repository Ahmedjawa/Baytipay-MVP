import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack,
  Print,
  Close,
  Download,
  Send
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { venteService } from '../services/venteService';
import { previewDocument, generateDocument, DOCUMENT_TYPES } from '../services/documentService';
import moment from 'moment';

function VenteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vente, setVente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);

  useEffect(() => {
    const fetchVente = async () => {
      try {
        setLoading(true);
        const response = await venteService.getVenteById(id);
        setVente(response.data);
        setSelectedDocumentType(response.data.typeDocument || 'FACTURE_TTC');
      } catch (error) {
        setError(error.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchVente();
  }, [id]);

  const handleImprimerFacture = async () => {
    try {
      setDocumentPreviewLoading(true);
      const pdfBlob = await previewDocument(id, selectedDocumentType);
      const url = URL.createObjectURL(pdfBlob);
      setPreviewUrl(url);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error("Erreur lors de l'impression:", error);
      setError(error.message || "Erreur lors de l'impression");
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
      const pdfBlob = await generateDocument(id, selectedDocumentType);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vente?.numeroDocument || 'document'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      setError(error.message || 'Erreur lors du téléchargement');
    }
  };

  const renderClientInfo = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Client</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Raison Sociale</Typography>
          <Typography>{vente?.client?.raisonSociale || `${vente?.client?.prenom} ${vente?.client?.nom}`}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Adresse</Typography>
          <Typography>{vente?.client?.adresse}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Téléphone</Typography>
          <Typography>{vente?.client?.telephone}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Email</Typography>
          <Typography>{vente?.client?.email}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderArticles = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Articles</Typography>
      <Grid container spacing={2}>
        {vente?.articles?.map((article, index) => (
          <React.Fragment key={index}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1">{article.designation}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {article.quantite} x {article.prixUnitaireHT.toFixed(2)} € HT
                  </Typography>
                </Box>
                <Typography variant="subtitle1">
                  {article.montantTTC.toFixed(2)} € TTC
                </Typography>
              </Box>
            </Grid>
            {index < vente.articles.length - 1 && (
              <Grid item xs={12}>
                <Divider />
              </Grid>
            )}
          </React.Fragment>
        ))}
      </Grid>
    </Paper>
  );

  const renderPaiement = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Paiement</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Mode de paiement</Typography>
          <Typography>{vente?.modePaiement}</Typography>
        </Grid>
        {vente?.paiementDetails && (
          <>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Montant reçu</Typography>
              <Typography>{vente.paiementDetails.montantRecu?.toFixed(2)} €</Typography>
            </Grid>
            {vente.paiementDetails.reference && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Référence</Typography>
                <Typography>{vente.paiementDetails.reference}</Typography>
              </Grid>
            )}
          </>
        )}
      </Grid>
    </Paper>
  );

  const renderEcheancier = () => {
    if (!vente?.echeancier?.length) return null;

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Échéancier</Typography>
        <Grid container spacing={2}>
          {vente.echeancier.map((echeance, index) => (
            <React.Fragment key={index}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle1">
                      Échéance {index + 1}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {moment(echeance.dateEcheance).format('DD/MM/YYYY')}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle1">
                    {parseFloat(echeance.montant || 0).toFixed(2)} €
                  </Typography>
                </Box>
              </Grid>
              {index < vente.echeancier.length - 1 && (
                <Grid item xs={12}>
                  <Divider />
                </Grid>
              )}
            </React.Fragment>
          ))}
        </Grid>
      </Paper>
    );
  };

  const renderTotaux = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Totaux</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Total HT</Typography>
          <Typography>{vente?.montantTotalHT?.toFixed(2)} €</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">TVA</Typography>
          <Typography>{vente?.montantTaxes?.toFixed(2)} €</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6">Total TTC</Typography>
          <Typography variant="h5">{vente?.montantTotalTTC?.toFixed(2)} €</Typography>
        </Grid>
      </Grid>
    </Paper>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/ventes')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4">
            {vente?.typeDocument === 'FACTURE_TTC' ? 'Facture' :
             vente?.typeDocument === 'FACTURE_PROFORMA' ? 'Devis' :
             vente?.typeDocument === 'BON_LIVRAISON' ? 'Bon de Livraison' : 'Document'} 
            {vente?.numeroDocument}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Print />}
            onClick={handleImprimerFacture}
            disabled={documentPreviewLoading}
          >
            Imprimer
          </Button>
        </Box>
      </Box>

      {/* Contenu */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {renderClientInfo()}
          {renderArticles()}
          {renderPaiement()}
          {renderEcheancier()}
          {renderTotaux()}
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Informations</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Date</Typography>
                <Typography>{moment(vente?.dateVente).format('DD/MM/YYYY')}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Statut</Typography>
                <Typography>{vente?.statut}</Typography>
              </Grid>
              {vente?.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Notes</Typography>
                  <Typography>{vente.notes}</Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog de prévisualisation */}
      <Dialog
        open={previewDialogOpen}
        onClose={handleClosePreview}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Aperçu du document
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
            onClick={() => {}} 
            variant="contained"
            color="primary"
            startIcon={<Send />}
            disabled={!previewUrl || documentPreviewLoading}
          >
            Envoyer par Email
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default VenteDetails;