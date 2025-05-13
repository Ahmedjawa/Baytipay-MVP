// client/src/components/vente/RecapitulatifStep.js

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
  Download
} from '@mui/icons-material';

function RecapitulatifStep({ venteData, updateVenteData }) {
  // Fonction pour formater les dates
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('fr-FR');
  };
  
  const handlePrintEcheancier = () => {
    // Ici vous implémenterez la logique d'impression selon votre modèle
    console.log('Impression des effets/chèques selon le modèle');
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

  // Fonction pour rendre l'échéancier
  const renderEcheancier = () => {
    if (!venteData.echeancier || venteData.echeancier.length === 0) {
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
            {venteData.echeancier.map((echeance, index) => (
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

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Récapitulatif de la vente
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Grid container spacing={3}>
        {/* Informations client */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" /> Informations client
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {venteData.client ? (
                <List dense>
                  <ListItem>
                    <ListItemText 
                      primary="Nom complet"
                      secondary={`${venteData.client.nom} ${venteData.client.prenom}`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Téléphone"
                      secondary={venteData.client.telephone || "N/A"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Email"
                      secondary={venteData.client.email || "N/A"}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Adresse"
                      secondary={venteData.client.adresse || "N/A"}
                    />
                  </ListItem>
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucun client sélectionné.
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
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Table size="small" sx={{ maxWidth: '300px' }}>
                  <TableBody>
                    <TableRow>
                      <TableCell component="th">Sous-total:</TableCell>
                      <TableCell align="right">{venteData.sousTotal.toFixed(2)} TND</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th">Remise globale:</TableCell>
                      <TableCell align="right">{venteData.remise.toFixed(2)} TND</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th">TVA ({(venteData.tva / (venteData.sousTotal - venteData.remise) * 100).toFixed(0)}%):</TableCell>
                      <TableCell align="right">{venteData.tva.toFixed(2)} TND</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>Total TTC:</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{venteData.totalTTC.toFixed(2)} TND</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>

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
                {/* Nouveau bouton pour l'impression des effets/chèques */}
                {['cheque', 'effet', 'cheques_multiples', 'effets_multiples', 'mixte'].includes(venteData.modePaiement) && (
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      fullWidth
                      startIcon={<Print />}
                      onClick={() => handlePrintEcheancier()}
                    >
                      {['cheque', 'cheques_multiples'].includes(venteData.modePaiement) 
                        ? 'Imprimer les chèques' 
                        : ['effet', 'effets_multiples'].includes(venteData.modePaiement)
                          ? 'Imprimer les effets'
                          : venteData.modePaiement === 'mixte' && venteData.paiementDetails.typeEcheancier === 'cheque'
                            ? 'Imprimer les chèques'
                            : venteData.modePaiement === 'mixte' && venteData.paiementDetails.typeEcheancier === 'effet'
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