// client/src/components/vente/RecapitulatifStep.js

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Person,
  ShoppingCart,
  Payment,
  EventNote,
  Receipt,
  AccountBalance,
  CalendarToday,
  Money,
  Email,
  Download,
  Description,
  Close,
  FullscreenExit,
  Fullscreen,
  Save
} from '@mui/icons-material';
import { generateDocument, DOCUMENT_TYPES, previewDocument } from '../../services/documentService';
import DocumentMenu from '../DocumentMenu.jsx';
import { transformerEnBonLivraison } from '../../services/venteService';
import { useNavigate } from 'react-router-dom';
import { venteService } from '../../services/venteService';
import { Checkbox, FormControlLabel } from '@mui/material';

function RecapitulatifStep({ 
  venteData, 
  updateVenteData, 
  onSaveVente,
  isDevis = false,
  isBonLivraison = false,
  selectedVentes = [],
  onSelectionChange = () => {}
}) {
  // État pour le menu d'impression
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  // Suppression des états et fonctions liés à l'impression
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleDetailsToggle = () => {
    setDetailsOpen(!detailsOpen);
  };

  // Fonction pour formater la date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  // Fonction pour rendre l'échéancier
  const renderEcheancier = () => {
    if (!venteData.echeancier || venteData.echeancier.length === 0) {
      return <Typography variant="body2">Aucun échéancier défini</Typography>;
    }

    return (
      <List dense>
        {venteData.echeancier.map((echeance, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={`Échéance ${index + 1}`}
              secondary={`${formatDate(echeance.dateEcheance)} - ${parseFloat(echeance.montant || 0).toFixed(2)} TND`}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const handleDocumentSelect = async (documentType) => {
    setSelectedDocumentType(documentType);
    
    try {
      setLoading(true);
      
      // Si la vente n'est pas encore enregistrée, on l'enregistre d'abord
      if (!venteData.id) {
        await onSaveVente(true);
      }
      
      // Prévisualiser le document
      const pdfBlob = await previewDocument(venteData.id, documentType, {});
      const url = URL.createObjectURL(pdfBlob);
      setPreviewUrl(url);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
      alert('Erreur lors de la prévisualisation du document: ' + error.message);
    } finally {
      setLoading(false);
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
      const pdfBlob = await generateDocument(venteData.id, selectedDocumentType, {});
      
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
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du document: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Gestion de la conversion en bon de livraison
  const handleConvertToBonLivraison = async () => {
    try {
      if (!window.confirm('Voulez-vous transformer ce devis en bon de livraison ?')) {
        return;
      }

      console.log('État initial de la vente:', venteData);

      // Si la vente n'est pas encore enregistrée, la sauvegarder d'abord
      if (!venteData.id) {
        console.log('Sauvegarde initiale de la vente...');
        const saveResult = await onSaveVente(true);
        if (!saveResult || !saveResult.success) {
          throw new Error('Erreur lors de la sauvegarde initiale');
        }
        console.log('Vente sauvegardée avec succès:', saveResult);
      }

      // Mettre à jour le type de document
      console.log('Mise à jour du type de document...');
      const updatedVenteData = {
        ...venteData,
        typeDocument: 'FACTURE_PROFORMA'
      };
      updateVenteData(updatedVenteData);

      // Sauvegarder la mise à jour
      const updateResult = await onSaveVente(true);
      if (!updateResult || !updateResult.success) {
        throw new Error('Erreur lors de la mise à jour du type de document');
      }
      console.log('Type de document mis à jour:', updateResult);

      // Attendre un peu pour s'assurer que la base de données est mise à jour
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Transformer en bon de livraison
      console.log('Transformation en bon de livraison...');
      const result = await transformerEnBonLivraison(venteData.id);
      console.log('Résultat de la transformation:', result);

      if (result.success && result.data.vente) {
        // Rediriger vers la nouvelle vente
        navigate(`/ventes/${result.data.vente._id}?type=BON_LIVRAISON`);
      } else {
        throw new Error('Erreur lors de la transformation');
      }
    } catch (error) {
      console.error('Erreur lors de la conversion:', error);
      alert(error.message || 'Erreur lors de la conversion en bon de livraison');
    }
  };

  // Fonction pour créer le tableau des types de documents disponibles
  const getDocumentTypeOptions = () => {
    if (isDevis) {
      return [
        { key: 'FACTURE_PROFORMA', label: 'Devis' }
      ];
    }
    
    if (isBonLivraison) {
      return [
        { key: 'BON_LIVRAISON', label: 'Bon de livraison' }
      ];
    }
    
    // Pour une facture, on propose tous les types de documents
    return [
      { key: 'FACTURE_TTC', label: 'Facture TTC' },
      { key: 'FACTURE_HT', label: 'Facture HT' },
      { key: 'BON_LIVRAISON', label: 'Bon de livraison' },
      { key: 'AVOIR', label: 'Avoir' },
      { key: 'FACTURE_RAS', label: 'Facture avec retenue à la source' },
      { key: 'FACTURE_FODEC', label: 'Facture avec FODEC' }
    ];
  };

  // Fonction pour rendre les détails de paiement selon le mode
  const renderPaiementDetails = () => {
    switch (venteData.modePaiement) {
      case 'especes':
        return (
          <List dense>
            <ListItem>
              <ListItemText
                primary="Montant reçu"
                secondary={`${parseFloat(venteData.paiementDetails.montantRecu).toFixed(2)} TND`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Monnaie rendue"
                secondary={`${parseFloat(venteData.paiementDetails.monnaie).toFixed(2)} TND`}
              />
            </ListItem>
          </List>
        );

      case 'cheque':
      case 'effet':
        return (
          <List dense>
            <ListItem>
              <ListItemText
                primary={venteData.modePaiement === 'cheque' ? "Numéro du chèque" : "Numéro de l'effet"}
                secondary={venteData.paiementDetails.reference || "N/A"}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Banque"
                secondary={venteData.paiementDetails.banque || "N/A"}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Date d'échéance"
                secondary={formatDate(venteData.paiementDetails.dateEcheance)}
              />
            </ListItem>
          </List>
        );

      case 'mixte':
        return (
          <>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Montant en espèces"
                  secondary={`${parseFloat(venteData.paiementDetails.montantRecu).toFixed(2)} TND`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Type pour le reste"
                  secondary={venteData.paiementDetails.typeEcheancier === 'effet' ? 'Effets' : 'Chèques'}
                />
              </ListItem>
            </List>
            {renderEcheancier()}
          </>
        );

      case 'cheques_multiples':
      case 'effets_multiples':
        return renderEcheancier();

      default:
        return <Typography variant="body2">Détails non disponibles</Typography>;
    }
  };

  const renderResume = () => {
    return (
      <Grid container spacing={3}>
        {/* Informations client */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" /> Informations client
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1">
                  {venteData.client?.raisonSociale || 
                    `${venteData.client?.prenom || ''} ${venteData.client?.nom || ''}`}
                </Typography>
                {venteData.client?.matriculeFiscale && (
                  <Typography variant="body2" color="text.secondary">
                    M.F: {venteData.client.matriculeFiscale}
                  </Typography>
                )}
                {venteData.client?.adresse && (
                  <Typography variant="body2" color="text.secondary">
                    {venteData.client.adresse}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Détails du paiement */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Payment color="primary" /> Détails du paiement
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Chip 
                  label={(() => {
                    switch(venteData.modePaiement) {
                      case 'especes': return 'Espèces';
                      case 'cheque': return 'Chèque';
                      case 'effet': return 'Effet';
                      case 'cheques_multiples': return 'Chèques multiples';
                      case 'effets_multiples': return 'Effets multiples';
                      case 'mixte': return 'Paiement mixte';
                      default: return 'Non spécifié';
                    }
                  })()}
                  color="primary"
                  icon={(() => {
                    switch(venteData.modePaiement) {
                      case 'especes': return <Money />;
                      case 'cheque': 
                      case 'cheques_multiples': return <Receipt />;
                      case 'effet':
                      case 'effets_multiples': return <AccountBalance />;
                      case 'mixte': return <Payment />;
                      default: return <Payment />;
                    }
                  })()}
                />
              </Box>
              
              {renderPaiementDetails()}
            </CardContent>
          </Card>
        </Grid>

        {/* Détails des articles */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCart color="primary" /> Articles
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Article</TableCell>
                      <TableCell align="right">Prix unitaire</TableCell>
                      <TableCell align="right">Quantité</TableCell>
                      <TableCell align="right">Remise (%)</TableCell>
                      <TableCell align="right">Total HT</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {venteData.articles.map((article, index) => (
                      <TableRow key={article.id || index}>
                        <TableCell>{article.designation}</TableCell>
                        <TableCell align="right">{article.prixUnitaire.toFixed(2)} TND</TableCell>
                        <TableCell align="right">{article.quantite}</TableCell>
                        <TableCell align="right">{article.remise || 0}%</TableCell>
                        <TableCell align="right">
                          {((article.prixUnitaire * article.quantite) * (1 - (article.remise || 0) / 100)).toFixed(2)} TND
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Nouvelle fonction pour la transformation groupée
  const handleTransformGroup = async (type) => {
    try {
      if (selectedVentes.length === 0) {
        alert('Veuillez sélectionner au moins un document à transformer');
        return;
      }

      let result;
      if (type === 'BL' && isDevis) {
        result = await venteService.transformerDevisEnBL(selectedVentes);
      } else if (type === 'FACTURE' && isBonLivraison) {
        result = await venteService.transformerBLEnFactures(selectedVentes, venteData.modePaiement);
      }

      if (result.success) {
        alert('Transformation réussie');
        // Rediriger vers la liste des ventes ou rafraîchir la page
        window.location.reload();
      }
    } catch (error) {
      console.error('Erreur lors de la transformation groupée:', error);
      alert(error.message || 'Erreur lors de la transformation');
    }
  };

  // Nouvelle fonction pour la génération de documents complémentaires
  const handleGenerateComplementaryDocument = async (typeDocument) => {
    try {
      if (!venteData.id) {
        await onSaveVente();
      }

      const result = await venteService.genererDocumentComplementaire(
        venteData.id,
        typeDocument
      );

      if (result.success) {
        alert('Document complémentaire généré avec succès');
        // Prévisualiser le document
        const pdfBlob = await previewDocument(result.data._id, typeDocument, {});
        const url = URL.createObjectURL(pdfBlob);
        setPreviewUrl(url);
        setPreviewDialogOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error);
      alert(error.message || 'Erreur lors de la génération du document');
    }
  };

  return (
    <Box>
      {renderResume()}
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start', gap: 2 }}>
        {/* Sélection multiple */}
        {selectedVentes.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleTransformGroup(isDevis ? 'BL' : 'FACTURE')}
          >
            Transformer {selectedVentes.length} document(s)
          </Button>
        )}

        {/* Actions individuelles */}
        {isDevis && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Description />}
            onClick={handleConvertToBonLivraison}
          >
            Convertir en bon de livraison
          </Button>
        )}

        {/* Documents complémentaires pour les factures */}
        {!isDevis && !isBonLivraison && (
          <DocumentMenu
            onSelect={handleGenerateComplementaryDocument}
            documentTypes={[
              { key: 'FACTURE_RAS', label: 'Retenue à la source' },
              { key: 'FACTURE_FODEC', label: 'FODEC' }
            ]}
          />
        )}
      </Box>

      {/* Dialog de prévisualisation */}
      <Dialog
        open={previewDialogOpen}
        onClose={handleClosePreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Prévisualisation du document
          <IconButton
            onClick={() => setPreviewFullscreen(!previewFullscreen)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            {previewFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {previewUrl && (
            <iframe
              src={previewUrl}
              style={{
                width: '100%',
                height: previewFullscreen ? '80vh' : '60vh',
                border: 'none'
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Fermer</Button>
          <Button onClick={handleDownloadDocument} color="primary">
            Télécharger
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RecapitulatifStep;