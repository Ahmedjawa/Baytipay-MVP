// client/src/components/achat/PaiementStep.js - Étape 3: Mode de paiement
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
  ReceiptLong, Info, ExpandMore, ExpandLess, Scanner
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fr from 'date-fns/locale/fr';

/**
 * PaiementStep component pour les achats
 * 
 * @param {object} props
 * @param {object} props.achatData - Achat data
 * @param {function} props.updateAchatData - Update achat data function
 * @param {function} props.onValidate - On validate function
 */
function PaiementStep({ achatData, updateAchatData, onValidate }) {
  // État du composant
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialiser les détails du paiement si nécessaire
  useEffect(() => {
    if (['cheque', 'effet'].includes(achatData.modePaiement) && !achatData.paiementDetails.dateEcheance) {
      const dateEcheance = new Date();
      dateEcheance.setDate(dateEcheance.getDate() + 30);
      
      updateAchatData({
        paiementDetails: {
          ...achatData.paiementDetails,
          dateEcheance
        }
      });
    }
  }, [achatData.modePaiement, achatData.paiementDetails, updateAchatData]);

  const handleModePaiementChange = (event) => {
    const mode = event.target.value;
    
    updateAchatData({
      modePaiement: mode,
      paiementDetails: {
        montantRecu: mode === 'especes' ? achatData.totalTTC : 0,
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
      ...achatData.paiementDetails,
      [name]: value
    };
    
    if (name === 'montantRecu') {
      const montantRecu = parseFloat(value) || 0;
      updatedDetails.monnaie = Math.max(0, montantRecu - achatData.totalTTC).toFixed(2);
    }
    
    updateAchatData({ paiementDetails: updatedDetails });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Gérer la sélection de la date d'échéance
  const handleDateChange = (date) => {
    updateAchatData({
      paiementDetails: {
        ...achatData.paiementDetails,
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
    
    switch(achatData.modePaiement) {
      case 'especes':
        const montantRecu = parseFloat(achatData.paiementDetails.montantRecu) || 0;
        if (montantRecu < achatData.totalTTC) {
          newErrors.montantRecu = "Le montant payé doit être au moins égal au total";
        }
        break;
        
      case 'cheque':
      case 'effet':
        if (!achatData.paiementDetails.reference?.trim()) {
          newErrors.reference = "Référence requise";
        }
        if (!achatData.paiementDetails.banque?.trim()) {
          newErrors.banque = "Banque requise";
        }
        if (!achatData.paiementDetails.dateEcheance) {
          newErrors.dateEcheance = "Date d'échéance requise";
        }
        break;
        
      case 'mixte':
        const montantMixte = parseFloat(achatData.paiementDetails.montantRecu) || 0;
        if (montantMixte <= 0) {
          newErrors.montantRecu = "Montant en espèces requis";
        }
        if (montantMixte >= achatData.totalTTC) {
          newErrors.montantRecu = "Le montant doit être inférieur au total";
        }
        if (!achatData.paiementDetails.typeEcheancier) {
          newErrors.typeEcheancier = "Type de paiement requis";
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Connecter la validation à onValidate
  useEffect(() => {
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
    switch (achatData.modePaiement) {
      case 'especes':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Montant payé"
                name="montantRecu"
                type="number"
                value={achatData.paiementDetails.montantRecu}
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
                value={achatData.paiementDetails.monnaie}
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
                label={achatData.modePaiement === 'cheque' ? "Numéro du chèque" : "Numéro de l'effet"}
                name="reference"
                value={achatData.paiementDetails.reference}
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
                value={achatData.paiementDetails.banque}
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
                  value={achatData.paiementDetails.dateEcheance}
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
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 1 }}>
                Vous pourrez scanner la pièce justificative à l'étape suivante.
              </Alert>
            </Grid>
          </Grid>
        );
        
      case 'cheques_multiples':
        return (
          <Alert severity="info" sx={{ m: 2 }}>
            Vous pourrez scanner les chèques à l'étape suivante et créer l'échéancier correspondant.
          </Alert>
        );

      case 'effets_multiples':
        return (
          <Alert severity="info" sx={{ m: 2 }}>
            Vous pourrez scanner les effets à l'étape suivante et créer l'échéancier correspondant.
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
                value={achatData.paiementDetails.montantRecu}
                onChange={handlePaiementDetailsChange}
                fullWidth
                error={!!errors.montantRecu}
                helperText={errors.montantRecu}
                InputProps={{
                  startAdornment: <Money fontSize="small" sx={{ mr: 1 }} />,
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>,
                  inputProps: { 
                    min: 0, 
                    max: achatData.totalTTC, 
                    step: 0.01 
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.typeEcheancier}>
                <InputLabel>Type pour le reste</InputLabel>
                <Select
                  value={achatData.paiementDetails.typeEcheancier || 'effet'}
                  onChange={(e) => updateAchatData({
                    paiementDetails: {
                      ...achatData.paiementDetails,
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
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 1 }}>
                Vous pourrez scanner les pièces justificatives à l'étape suivante.
              </Alert>
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
              Total à payer: <strong>{achatData.totalTTC.toFixed(2)} TND</strong>
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
                  value={achatData.modePaiement}
                  onChange={handleModePaiementChange}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          borderColor: achatData.modePaiement === 'especes' ? 'primary.main' : 'divider',
                          bgcolor: achatData.modePaiement === 'especes' ? 'action.hover' : 'background.paper'
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
                          borderColor: achatData.modePaiement === 'cheque' ? 'primary.main' : 'divider',
                          bgcolor: achatData.modePaiement === 'cheque' ? 'action.hover' : 'background.paper'
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
                          borderColor: achatData.modePaiement === 'effet' ? 'primary.main' : 'divider',
                          bgcolor: achatData.modePaiement === 'effet' ? 'action.hover' : 'background.paper'
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
                          borderColor: achatData.modePaiement === 'cheques_multiples' ? 'primary.main' : 'divider',
                          bgcolor: achatData.modePaiement === 'cheques_multiples' ? 'action.hover' : 'background.paper'
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
                          borderColor: achatData.modePaiement === 'effets_multiples' ? 'primary.main' : 'divider',
                          bgcolor: achatData.modePaiement === 'effets_multiples' ? 'action.hover' : 'background.paper'
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
                          borderColor: achatData.modePaiement === 'mixte' ? 'primary.main' : 'divider',
                          bgcolor: achatData.modePaiement === 'mixte' ? 'action.hover' : 'background.paper'
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
                      <strong>Paiement mixte:</strong> Combinaison d'espèces et de chèques/effets.
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
              
              {achatData.modePaiement !== 'especes' && (
                <Box sx={{ mt: 2, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: 'text.secondary' }}>
                  <Scanner fontSize="small" />
                  <Typography variant="body2">
                    L'étape suivante vous permettra de scanner les documents de paiement
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PaiementStep;