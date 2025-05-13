// client/src/components/vente/PaiementStep.js - Étape 3: Mode de paiement
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Grid, Paper,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
  InputAdornment, Card, CardContent, Divider, Stack,
  Alert, IconButton, Collapse, InputLabel, Select, MenuItem,
  FormHelperText
} from '@mui/material';
import { 
  Payment, AccountBalance, Money, CreditCard, CalendarMonth, 
  ReceiptLong, Info, ExpandMore, ExpandLess
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fr from 'date-fns/locale/fr';

/**
 * PaiementStep component
 * 
 * @param {object} props
 * @param {object} props.venteData - Vente data
 * @param {function} props.updateVenteData - Update vente data function
 * @param {function} props.onValidate - On validate function
 */
function PaiementStep({ venteData, updateVenteData, onValidate }) {
  // État du composant
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [errors, setErrors] = useState({}); // Add missing errors state

  // Initialiser les détails du paiement si nécessaire
  useEffect(() => {
    if (['cheque', 'effet'].includes(venteData.modePaiement) && !venteData.paiementDetails.dateEcheance) {
      const dateEcheance = new Date();
      dateEcheance.setDate(dateEcheance.getDate() + 30);
      
      updateVenteData({
        paiementDetails: {
          ...venteData.paiementDetails,
          dateEcheance
        }
      });
    }
  }, [venteData.modePaiement, venteData.paiementDetails, updateVenteData]); // Remove onValidate from dependencies

  const handleModePaiementChange = (event) => {
    const mode = event.target.value;
    
    updateVenteData({
      modePaiement: mode,
      paiementDetails: {
        montantRecu: mode === 'especes' ? venteData.totalTTC : 0,
        monnaie: 0,
        reference: '',
        banque: '',
        dateEcheance: mode === 'especes' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        typeEcheancier: mode === 'mixte' ? 'effet' : undefined
      }
    });
    
    setErrors({});
  };

  const handlePaiementDetailsChange = (e) => {
    const { name, value } = e.target;
    
    const updatedDetails = {
      ...venteData.paiementDetails,
      [name]: value
    };
    
    if (name === 'montantRecu') {
      const montantRecu = parseFloat(value) || 0;
      updatedDetails.monnaie = Math.max(0, montantRecu - venteData.totalTTC).toFixed(2);
    }
    
    updateVenteData({ paiementDetails: updatedDetails });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Gérer la sélection de la date d'échéance
  const handleDateChange = (date) => {
    updateVenteData({
      paiementDetails: {
        ...venteData.paiementDetails,
        dateEcheance: date
      }
    });
    
    if (errors.dateEcheance) {
      setErrors(prev => ({ ...prev, dateEcheance: null }));
    }
  };

  // Valider les détails du paiement
  const validatePaiementDetails = () => {
    const newErrors = {};
    
    switch(venteData.modePaiement) {
      case 'especes':
        const montantRecu = parseFloat(venteData.paiementDetails.montantRecu) || 0;
        if (montantRecu < venteData.totalTTC) {
          newErrors.montantRecu = "Le montant reçu doit être au moins égal au total";
        }
        break;
        
      case 'cheque':
      case 'effet':
        if (!venteData.paiementDetails.reference?.trim()) {
          newErrors.reference = "Référence requise";
        }
        if (!venteData.paiementDetails.banque?.trim()) {
          newErrors.banque = "Banque requise";
        }
        if (!venteData.paiementDetails.dateEcheance) {
          newErrors.dateEcheance = "Date d'échéance requise";
        }
        break;
        
      case 'mixte':
        const montantMixte = parseFloat(venteData.paiementDetails.montantRecu) || 0;
        if (montantMixte <= 0) {
          newErrors.montantRecu = "Montant en espèces requis";
        }
        if (montantMixte >= venteData.totalTTC) {
          newErrors.montantRecu = "Le montant doit être inférieur au total";
        }
        if (!venteData.paiementDetails.typeEcheancier) {
          newErrors.typeEcheancier = "Type de paiement requis";
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Connecter la validation à onValidate
  useEffect(() => {
    // Si onValidate existe, assigner la fonction de validation
    if (onValidate) {
      onValidate(validatePaiementDetails);
    }
  }, [onValidate]);

  // Gérer l'ouverture/fermeture des détails
  const handleDetailsToggle = () => {
    setDetailsOpen(!detailsOpen);
  };

  // Afficher le formulaire approprié selon le mode de paiement
  const renderPaiementDetailsForm = () => {
    switch (venteData.modePaiement) {
      case 'especes':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Montant reçu"
                name="montantRecu"
                type="number"
                value={venteData.paiementDetails.montantRecu}
                onChange={handlePaiementDetailsChange}
                fullWidth
                error={!!errors.montantRecu}
                helperText={errors.montantRecu}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Money />
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Monnaie à rendre"
                value={venteData.paiementDetails.monnaie}
                fullWidth
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Payment />
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>
                }}
              />
            </Grid>
          </Grid>
        );
        
      case 'cheque':
      case 'effet':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label={venteData.modePaiement === 'cheque' ? "Numéro du chèque" : "Numéro de l'effet"}
                name="reference"
                value={venteData.paiementDetails.reference}
                onChange={handlePaiementDetailsChange}
                fullWidth
                error={!!errors.reference}
                helperText={errors.reference}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ReceiptLong />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Banque"
                name="banque"
                value={venteData.paiementDetails.banque}
                onChange={handlePaiementDetailsChange}
                fullWidth
                error={!!errors.banque}
                helperText={errors.banque}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountBalance />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
  <DatePicker
    label="Date d'échéance"
    value={venteData.paiementDetails.dateEcheance}
    onChange={handleDateChange}
    renderInput={(params) => (
      <TextField
        {...params}
        fullWidth
        error={!!errors.dateEcheance}
        helperText={errors.dateEcheance}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <CalendarMonth />
            </InputAdornment>
          )
        }}
      />
    )}
  />
</LocalizationProvider>
            </Grid>
          </Grid>
        );
        
      case 'cheques_multiples':
        return (
          <Alert severity="info" sx={{ m: 2 }}>
            Les chèques multiples seront saisis dans l'étape suivante
          </Alert>
        );

      case 'effets_multiples':
        return (
          <Alert severity="info" sx={{ m: 2 }}>
            Les effets multiples seront saisis dans l'étape suivante
          </Alert>
        );

      case 'mixte':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Montant en espèces"
                name="montantRecu"
                type="number"
                value={venteData.paiementDetails.montantRecu}
                onChange={handlePaiementDetailsChange}
                fullWidth
                error={!!errors.montantRecu}
                helperText={errors.montantRecu}
                InputProps={{
                  startAdornment: <Money fontSize="small" sx={{ mr: 1 }} />,
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>,
                  inputProps: { 
                    min: 0, 
                    max: venteData.totalTTC, 
                    step: 0.01 
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.typeEcheancier}>
                <InputLabel>Type pour le reste</InputLabel>
                <Select
                  value={venteData.paiementDetails.typeEcheancier || 'effet'}
                  onChange={(e) => updateVenteData({
                    paiementDetails: {
                      ...venteData.paiementDetails,
                      typeEcheancier: e.target.value
                    }
                  })}
                  label="Type pour le reste"
                >
                  <MenuItem value="effet">Effets</MenuItem>
                  <MenuItem value="cheque">Chèques</MenuItem>
                </Select>
                {errors.typeEcheancier && (
                  <FormHelperText>{errors.typeEcheancier}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Mode de paiement
      </Typography>

      <Grid container spacing={3}>
        {/* Résumé du montant */}
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="h6" gutterBottom textAlign="center">
              Total à payer: <strong>{venteData.totalTTC.toFixed(2)} TND</strong>
            </Typography>
          </Paper>
        </Grid>

        {/* Sélection du mode de paiement */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Sélectionnez le mode de paiement</strong>
              </Typography>
              
              <FormControl component="fieldset">
                <RadioGroup
                  name="modePaiement"
                  value={venteData.modePaiement}
                  onChange={handleModePaiementChange}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          borderColor: venteData.modePaiement === 'especes' ? 'primary.main' : 'divider',
                          bgcolor: venteData.modePaiement === 'especes' ? 'action.hover' : 'background.paper'
                        }}
                      >
                        <FormControlLabel 
                          value="especes" 
                          control={<Radio color="primary" />} 
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Money color="action" />
                              <Typography>Espèces</Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          borderColor: venteData.modePaiement === 'cheque' ? 'primary.main' : 'divider',
                          bgcolor: venteData.modePaiement === 'cheque' ? 'action.hover' : 'background.paper'
                        }}
                      >
                        <FormControlLabel 
                          value="cheque" 
                          control={<Radio color="primary" />} 
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Payment color="action" />
                              <Typography>Chèque</Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          borderColor: venteData.modePaiement === 'effet' ? 'primary.main' : 'divider',
                          bgcolor: venteData.modePaiement === 'effet' ? 'action.hover' : 'background.paper'
                        }}
                      >
                        <FormControlLabel 
                          value="effet" 
                          control={<Radio color="primary" />} 
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ReceiptLong color="action" />
                              <Typography>Effet</Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          borderColor: venteData.modePaiement === 'cheques_multiples' ? 'primary.main' : 'divider',
                          bgcolor: venteData.modePaiement === 'cheques_multiples' ? 'action.hover' : 'background.paper'
                        }}
                      >
                        <FormControlLabel 
                          value="cheques_multiples" 
                          control={<Radio color="primary" />} 
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <CreditCard color="action" />
                              <Typography>Chèques multiples</Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          borderColor: venteData.modePaiement === 'effets_multiples' ? 'primary.main' : 'divider',
                          bgcolor: venteData.modePaiement === 'effets_multiples' ? 'action.hover' : 'background.paper'
                        }}
                      >
                        <FormControlLabel 
                          value="effets_multiples" 
                          control={<Radio color="primary" />} 
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ReceiptLong color="action" />
                              <Typography>Effets multiples</Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          borderColor: venteData.modePaiement === 'mixte' ? 'primary.main' : 'divider',
                          bgcolor: venteData.modePaiement === 'mixte' ? 'action.hover' : 'background.paper'
                        }}
                      >
                        <FormControlLabel 
                          value="mixte" 
                          control={<Radio color="primary" />} 
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Payment color="action" />
                              <Typography>Paiement mixte</Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </Grid>
                  </Grid>
                </RadioGroup>
              </FormControl>
              
              <Box sx={{ mt: 3 }}>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                  onClick={handleDetailsToggle}
                >
                  <Info fontSize="small" />
                  Détails sur les modes de paiement
                  {detailsOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </Typography>
                
                <Collapse in={detailsOpen}>
                  <Box sx={{ mt: 2, pl: 2, borderLeft: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" paragraph>
                      <strong>Espèces:</strong> Paiement immédiat en liquide.
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Chèque:</strong> Paiement par chèque unique avec date d'échéance.
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Effet:</strong> Lettre de change ou billet à ordre unique.
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Chèques multiples:</strong> Paiement échelonné avec plusieurs chèques.
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Effets multiples:</strong> Paiement échelonné avec plusieurs effets.
                    </Typography>
                    <Typography variant="body2">
                      <strong>Paiement mixte:</strong> Combinaison de différents moyens de paiement.
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Détails du paiement spécifiques au mode sélectionné */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Détails du paiement</strong>
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {renderPaiementDetailsForm()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PaiementStep;