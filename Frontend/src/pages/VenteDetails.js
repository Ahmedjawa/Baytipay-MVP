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
import { clientService } from '../services/clientService'; // Ajout du service client
import { articleService } from '../services/articleService'; // Ajout du service article
import { previewDocument, generateDocument, DOCUMENT_TYPES } from '../services/documentService';
import moment from 'moment';

function VenteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vente, setVente] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const [articlesDetails, setArticlesDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [documentPreviewLoading, setDocumentPreviewLoading] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);

  useEffect(() => {
    const fetchVenteWithDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Récupérer la vente
        const venteResponse = await venteService.getVenteById(id);
        const venteData = venteResponse.data;
        setVente(venteData);
        setSelectedDocumentType(venteData.typeDocument || 'FACTURE_TTC');

        // 2. Récupérer les détails du client si clientId existe
        if (venteData.clientId || venteData.client?._id) {
          try {
            const clientId = venteData.clientId || venteData.client._id;
            const clientResponse = await clientService.getClientById(clientId);
            setClientDetails(clientResponse.data);
          } catch (clientError) {
            console.warn('Erreur lors de la récupération du client:', clientError);
            // On continue même si le client n'est pas trouvé
          }
        }

        // 3. Récupérer les détails des articles
        if (venteData.lignes && venteData.lignes.length > 0) {
          const articlesDetailsPromises = venteData.lignes.map(async (ligne) => {
            try {
              // Si la ligne a un articleId et que c'est un PRODUIT, récupérer les détails
              if (ligne.articleId && ligne.type === 'PRODUIT') {
                const articleResponse = await articleService.getArticleById(ligne.articleId);
                return {
                  ...ligne,
                  articleDetails: articleResponse.data
                };
              }
              // Pour les services ou articles sans ID, retourner la ligne telle quelle
              return ligne;
            } catch (articleError) {
              console.warn(`Erreur lors de la récupération de l'article ${ligne.articleId}:`, articleError);
              // Retourner la ligne sans les détails en cas d'erreur
              return ligne;
            }
          });

          const articlesWithDetails = await Promise.all(articlesDetailsPromises);
          setArticlesDetails(articlesWithDetails);
        }

      } catch (error) {
        console.error('Erreur lors du chargement:', error);
        setError(error.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVenteWithDetails();
    }
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

  const renderClientInfo = () => {
    // Utiliser clientDetails si disponible, sinon fallback sur vente.client
    const client = clientDetails || vente?.client || {};
    
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Client</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Raison Sociale</Typography>
            <Typography>
              {client.raisonSociale || 
               (client.prenom && client.nom ? `${client.prenom} ${client.nom}` : 'Non spécifié')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Adresse</Typography>
            <Typography>
              {client.adresse || 'Non spécifiée'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Ville</Typography>
            <Typography>
              {client.ville ? `${client.codePostal || ''} ${client.ville}`.trim() : 'Non spécifiée'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Téléphone</Typography>
            <Typography>
              {client.telephone || 'Non spécifié'}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">Email</Typography>
            <Typography>
              {client.email || 'Non spécifié'}
            </Typography>
          </Grid>
          {client.numeroTVA && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Numéro TVA</Typography>
              <Typography>{client.numeroTVA}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };

  const renderArticles = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Articles</Typography>
      <Grid container spacing={2}>
        {articlesDetails?.length > 0 ? (
          articlesDetails.map((ligne, index) => {
            // Utiliser les détails de l'article si disponibles
            const articleInfo = ligne.articleDetails || {};
            const designation = ligne.designation || articleInfo.designation || 'Article sans désignation';
            const reference = articleInfo.reference || ligne.reference;
            
            return (
              <React.Fragment key={index}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{designation}</Typography>
                      {reference && (
                        <Typography variant="body2" color="text.secondary">
                          Réf: {reference}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Type: {ligne.type === 'PRODUIT' ? 'Produit' : 'Service'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {parseFloat(ligne.quantite || 0).toFixed(2)} x {parseFloat(ligne.prixUnitaireHT || 0).toFixed(2)} € HT
                        {ligne.remise > 0 && ` (Remise: ${ligne.remise}%)`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        TVA: {parseFloat(ligne.tauxTVA || 0).toFixed(1)}%
                      </Typography>
                      {articleInfo.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                          {articleInfo.description}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right', ml: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {parseFloat(ligne.montantTTC || 0).toFixed(2)} € TTC
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {parseFloat(ligne.montantHT || 0).toFixed(2)} € HT
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                {index < articlesDetails.length - 1 && (
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                )}
              </React.Fragment>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Typography color="text.secondary">Aucun article</Typography>
          </Grid>
        )}
      </Grid>
    </Paper>
  );

  const renderPaiement = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>Paiement</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Mode de paiement</Typography>
          <Typography>
            {(() => {
              switch(vente?.modePaiement) {
                case 'ESPECES': return 'Espèces';
                case 'CHEQUE_UNIQUE': return 'Chèque unique';
                case 'EFFET_UNIQUE': return 'Effet unique';
                case 'CHEQUES_MULTIPLES': return 'Chèques multiples';
                case 'EFFETS_MULTIPLES': return 'Effets multiples';
                case 'PAIEMENT_MIXTE': return 'Paiement mixte';
                case 'MIXTE': return 'Mixte';
                default: return vente?.modePaiement || 'Non spécifié';
              }
            })()}
          </Typography>
        </Grid>
        {vente?.paiements?.length > 0 && (
          <>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Montant payé</Typography>
              <Typography>
                {vente.paiements.reduce((sum, p) => sum + parseFloat(p.montant || 0), 0).toFixed(2)} €
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2">Statut du paiement</Typography>
              <Typography>
                {vente.paiements[0]?.statut || 'Non défini'}
              </Typography>
            </Grid>
            {vente.paiements[0]?.reference && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Référence</Typography>
                <Typography>{vente.paiements[0].reference}</Typography>
              </Grid>
            )}
            {vente.paiements[0]?.banque && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Banque</Typography>
                <Typography>{vente.paiements[0].banque}</Typography>
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
                    {echeance.statut && (
                      <Typography variant="body2" color="text.secondary">
                        Statut: {echeance.statut}
                      </Typography>
                    )}
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
          <Typography>{parseFloat(vente?.transaction?.montantTotalHT || 0).toFixed(2)} €</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">TVA</Typography>
          <Typography>{parseFloat(vente?.transaction?.montantTaxes || 0).toFixed(2)} €</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6">Total TTC</Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {parseFloat(vente?.transaction?.montantTotalTTC || 0).toFixed(2)} €
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement des détails...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          onClick={() => navigate('/ventes')} 
          sx={{ mt: 2 }}
          startIcon={<ArrowBack />}
        >
          Retour aux ventes
        </Button>
      </Box>
    );
  }

  if (!vente) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Vente non trouvée</Alert>
        <Button 
          onClick={() => navigate('/ventes')} 
          sx={{ mt: 2 }}
          startIcon={<ArrowBack />}
        >
          Retour aux ventes
        </Button>
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
            {vente?.typeDocument === 'FACTURE' ? 'Facture' :
             vente?.typeDocument === 'DEVIS' ? 'Devis' :
             vente?.typeDocument === 'BON_LIVRAISON' ? 'Bon de Livraison' : 'Document'} 
            {vente?.numeroDocument ? ` N° ${vente.numeroDocument}` : ''}
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
            {documentPreviewLoading ? 'Chargement...' : 'Imprimer'}
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
                <Typography>{moment(vente?.dateVente).format('DD/MM/YYYY à HH:mm')}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Statut</Typography>
                <Typography 
                  sx={{ 
                    color: vente?.statut === 'VALIDEE' ? 'success.main' : 
                           vente?.statut === 'ANNULEE' ? 'error.main' : 'warning.main' 
                  }}
                >
                  {vente?.statut || 'BROUILLON'}
                </Typography>
              </Grid>
              {vente?.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Notes</Typography>
                  <Typography>{vente.notes}</Typography>
                </Grid>
              )}
              {vente?.creePar && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Créé par</Typography>
                  <Typography>{vente.creePar.nom || 'Utilisateur'}</Typography>
                </Grid>
              )}
              {vente?.dateCreation && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Date de création</Typography>
                  <Typography>{moment(vente.dateCreation).format('DD/MM/YYYY à HH:mm')}</Typography>
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
            onClick={() => {/* Implémenter l'envoi par email */}} 
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