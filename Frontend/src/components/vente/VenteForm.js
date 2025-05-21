import React from 'react';
import {
  Box,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import frLocale from 'date-fns/locale/fr';

const steps = ['Informations générales', 'Articles', 'Paiement', 'Récapitulatif'];

const VenteForm = ({ 
  formData, 
  onChange, 
  activeStep, 
  onNext, 
  onBack, 
  onSubmit,
  isTransform = false 
}) => {
  const handleChange = (field) => (event) => {
    onChange({ [field]: event.target.value });
  };

  const handleDateChange = (date) => {
    onChange({ dateVente: date });
  };

  const handleLigneChange = (index, field) => (event) => {
    const newLignes = [...formData.lignesTransaction];
    newLignes[index] = {
      ...newLignes[index],
      [field]: event.target.value
    };
    onChange({ lignesTransaction: newLignes });
  };

  const handleAddLigne = () => {
    const newLigne = {
      designation: '',
      quantite: 1,
      prixUnitaireHT: 0,
      tauxTVA: 19,
      montantHT: 0,
      montantTVA: 0,
      montantTTC: 0
    };
    onChange({
      lignesTransaction: [...formData.lignesTransaction, newLigne]
    });
  };

  const handleRemoveLigne = (index) => {
    const newLignes = formData.lignesTransaction.filter((_, i) => i !== index);
    onChange({ lignesTransaction: newLignes });
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Numéro de document"
                value={formData.numeroDocument || ''}
                onChange={handleChange('numeroDocument')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
                <DatePicker
                  label="Date de vente"
                  value={formData.dateVente || new Date()}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth margin="normal" />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes internes"
                value={formData.notesInternes || ''}
                onChange={handleChange('notesInternes')}
                multiline
                rows={4}
                margin="normal"
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Désignation</TableCell>
                    <TableCell align="right">Quantité</TableCell>
                    <TableCell align="right">Prix unitaire HT</TableCell>
                    <TableCell align="right">Taux TVA</TableCell>
                    <TableCell align="right">Montant HT</TableCell>
                    <TableCell align="right">Montant TVA</TableCell>
                    <TableCell align="right">Montant TTC</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.lignesTransaction.map((ligne, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          value={ligne.designation || ''}
                          onChange={handleLigneChange(index, 'designation')}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={ligne.quantite || 1}
                          onChange={handleLigneChange(index, 'quantite')}
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={ligne.prixUnitaireHT || 0}
                          onChange={handleLigneChange(index, 'prixUnitaireHT')}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          value={ligne.tauxTVA || 19}
                          onChange={handleLigneChange(index, 'tauxTVA')}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {((ligne.quantite || 1) * (ligne.prixUnitaireHT || 0)).toFixed(2)} €
                      </TableCell>
                      <TableCell align="right">
                        {((ligne.quantite || 1) * (ligne.prixUnitaireHT || 0) * (ligne.tauxTVA || 19) / 100).toFixed(2)} €
                      </TableCell>
                      <TableCell align="right">
                        {((ligne.quantite || 1) * (ligne.prixUnitaireHT || 0) * (1 + (ligne.tauxTVA || 19) / 100)).toFixed(2)} €
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          color="error"
                          onClick={() => handleRemoveLigne(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddLigne}
                variant="outlined"
              >
                Ajouter une ligne
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Mode de paiement</InputLabel>
                <Select
                  value={formData.modePaiement || 'ESPECES'}
                  onChange={handleChange('modePaiement')}
                  label="Mode de paiement"
                >
                  <MenuItem value="ESPECES">Espèces</MenuItem>
                  <MenuItem value="CHEQUE_UNIQUE">Chèque unique</MenuItem>
                  <MenuItem value="EFFET_UNIQUE">Effet unique</MenuItem>
                  <MenuItem value="CHEQUES_MULTIPLES">Chèques multiples</MenuItem>
                  <MenuItem value="EFFETS_MULTIPLES">Effets multiples</MenuItem>
                  <MenuItem value="PAIEMENT_MIXTE">Paiement mixte</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Récapitulatif
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Informations générales
                  </Typography>
                  <Typography variant="body2">
                    Numéro de document: {formData.numeroDocument}
                  </Typography>
                  <Typography variant="body2">
                    Date de vente: {formData.dateVente?.toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    Mode de paiement: {formData.modePaiement}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Articles
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Désignation</TableCell>
                          <TableCell align="right">Quantité</TableCell>
                          <TableCell align="right">Prix unitaire HT</TableCell>
                          <TableCell align="right">Taux TVA</TableCell>
                          <TableCell align="right">Total HT</TableCell>
                          <TableCell align="right">Total TTC</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.lignesTransaction.map((ligne, index) => (
                          <TableRow key={index}>
                            <TableCell>{ligne.designation}</TableCell>
                            <TableCell align="right">{ligne.quantite}</TableCell>
                            <TableCell align="right">{ligne.prixUnitaireHT.toFixed(2)} €</TableCell>
                            <TableCell align="right">{ligne.tauxTVA}%</TableCell>
                            <TableCell align="right">
                              {(ligne.quantite * ligne.prixUnitaireHT).toFixed(2)} €
                            </TableCell>
                            <TableCell align="right">
                              {(ligne.quantite * ligne.prixUnitaireHT * (1 + ligne.tauxTVA / 100)).toFixed(2)} €
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Totaux
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Total HT: {formData.montantTotalHT?.toFixed(2)} €
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Total TVA: {formData.montantTaxes?.toFixed(2)} €
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="h6">
                        Total TTC: {formData.montantTotalTTC?.toFixed(2)} €
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {renderStepContent(activeStep)}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={onBack}
        >
          Retour
        </Button>
        <Box>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={onSubmit}
            >
              {isTransform ? 'Créer le bon de livraison' : 'Créer la vente'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={onNext}
            >
              Suivant
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default VenteForm; 