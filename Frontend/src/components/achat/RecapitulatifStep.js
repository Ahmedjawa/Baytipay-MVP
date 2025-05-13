// client/src/components/achat/RecapitulatifStep.js

import React from 'react';
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
  Button
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
  Print,
  Email,
  Download,
  BusinessCenter,
  AttachFile
} from '@mui/icons-material';

function RecapitulatifStep({ achatData, updateAchatData, onImprimer }) {
  // Fonction pour formater les dates
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('fr-FR');
  };
  
  const handlePrintEcheancier = () => {
    // Logique d'impression des effets/chèques selon le modèle
    console.log('Impression des effets/chèques selon le modèle');
  };

  // Fonction pour rendre les détails de paiement selon le mode
  const renderPaiementDetails = () => {
    switch (achatData.modePaiement) {
      case 'especes':
        return (
          <List dense>
            <ListItem>
              <ListItemText
                primary="Montant versé"
                secondary={`${parseFloat(achatData.paiementDetails.montantRecu || 0).toFixed(2)} TND`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Monnaie rendue"
                secondary={`${parseFloat(achatData.paiementDetails.monnaie || 0).toFixed(2)} TND`}
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
                primary={achatData.modePaiement === 'cheque' ? "Numéro du chèque" : "Numéro de l'effet"}
                secondary={achatData.paiementDetails.reference || "N/A"}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Banque"
                secondary={achatData.paiementDetails.banque || "N/A"}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Date d'échéance"
                secondary={formatDate(achatData.paiementDetails.dateEcheance)}
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
                  secondary={`${parseFloat(achatData.paiementDetails.montantRecu || 0).toFixed(2)} TND`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Type pour le reste"
                  secondary={achatData.paiementDetails.typeEcheancier === 'effet' ? 'Effets' : 'Chèques'}
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

  // Fonction pour rendre l'échéancier
  const renderEcheancier = () => {
    if (!achatData.echeancier || achatData.echeancier.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Aucun échéancier défini.
        </Typography>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Échéance</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Montant</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Référence</TableCell>
              <TableCell>Banque</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {achatData.echeancier.map((echeance, index) => (
              <TableRow key={echeance.id || index}>
                <TableCell>#{index + 1}</TableCell>
                <TableCell>{formatDate(echeance.date)}</TableCell>
                <TableCell>{parseFloat(echeance.montant).toFixed(2)} TND</TableCell>
                <TableCell>{echeance.typePaiement === 'cheque' ? 'Chèque' : 'Effet'}</TableCell>
                <TableCell>{echeance.reference}</TableCell>
                <TableCell>{echeance.banque}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Fonction pour rendre les documents scannés
  const renderScannedDocuments = () => {
    if (!achatData.scans || achatData.scans.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Aucun document scanné.
        </Typography>
      );
    }

    return (
      <List dense>
        {achatData.scans.map((doc, index) => (
          <ListItem key={index}>
            <ListItemText 
              primary={`Document #${index + 1}`}
              secondary={doc.description || `Scan du ${formatDate(doc.dateCreation || new Date())}`}
            />
            <Chip 
              label="Voir" 
              color="primary" 
              size="small" 
              onClick={() => console.log('Afficher le document', doc)} 
            />
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Récapitulatif de l'achat
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Informations fournisseur */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessCenter color="primary" /> Informations fournisseur
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {achatData.fournisseur ? (
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Nom"
                      secondary={achatData.fournisseur.nom || achatData.fournisseur.raisonSociale || "N/A"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Téléphone"
                      secondary={achatData.fournisseur.telephone || "N/A"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Email"
                      secondary={achatData.fournisseur.email || "N/A"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Adresse"
                      secondary={achatData.fournisseur.adresse || "N/A"}
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucun fournisseur sélectionné.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Détails de paiement */}
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
                    switch(achatData.modePaiement) {
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
                    switch(achatData.modePaiement) {
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
                    {achatData.articles.map((article, index) => (
                      <TableRow key={article.id || index}>
                        <TableCell>{article.designation}</TableCell>
                        <TableCell align="right">{article.prixUnitaire?.toFixed(2) || "0.00"} TND</TableCell>
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
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Table size="small" sx={{ maxWidth: '300px' }}>
                  <TableBody>
                    <TableRow>
                      <TableCell component="th">Sous-total:</TableCell>
                      <TableCell align="right">{achatData.sousTotal?.toFixed(2) || "0.00"} TND</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th">Remise globale:</TableCell>
                      <TableCell align="right">{achatData.remise?.toFixed(2) || "0.00"} TND</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th">TVA ({((achatData.tva && achatData.sousTotal && achatData.remise) ? 
                        (achatData.tva / (achatData.sousTotal - achatData.remise) * 100).toFixed(0) : 
                        "0")}%):</TableCell>
                      <TableCell align="right">{achatData.tva?.toFixed(2) || "0.00"} TND</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>Total TTC:</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{achatData.totalTTC?.toFixed(2) || "0.00"} TND</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Documents scannés */}
        {(achatData.modePaiement !== 'especes' || (achatData.scans && achatData.scans.length > 0)) && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachFile color="primary" /> Documents scannés
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {renderScannedDocuments()}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Actions de documents */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Documents
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Print />}
                    onClick={onImprimer}
                  >
                    Imprimer la facture
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Email />}
                  >
                    Envoyer par email
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Download />}
                  >
                    Télécharger (PDF)
                  </Button>
                </Grid>
                {/* Bouton pour l'impression des effets/chèques */}
                {['cheque', 'effet', 'cheques_multiples', 'effets_multiples', 'mixte'].includes(achatData.modePaiement) && (
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      fullWidth
                      startIcon={<Print />}
                      onClick={() => handlePrintEcheancier()}
                    >
                      {['cheque', 'cheques_multiples'].includes(achatData.modePaiement) 
                        ? 'Imprimer les chèques' 
                        : ['effet', 'effets_multiples'].includes(achatData.modePaiement)
                          ? 'Imprimer les effets'
                          : achatData.modePaiement === 'mixte' && achatData.paiementDetails.typeEcheancier === 'cheque'
                            ? 'Imprimer les chèques'
                            : achatData.modePaiement === 'mixte' && achatData.paiementDetails.typeEcheancier === 'effet'
                              ? 'Imprimer les effets'
                              : 'Imprimer documents de paiement'}
                    </Button>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default RecapitulatifStep;