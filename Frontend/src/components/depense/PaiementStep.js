// components/depense/PaiementStep.js
import React from 'react';
import {
  Box, Grid, TextField, Typography, FormControl,
  InputLabel, Select, MenuItem, FormControlLabel,
  Radio, RadioGroup, FormLabel, InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

function PaiementStep({ depenseData, updateDepenseData }) {
  const handlePaiementChange = (field) => (event) => {
    updateDepenseData({ 
      paiement: {
        ...depenseData.paiement,
        [field]: event.target.value
      }
    });
  };

  const handleDatePaiementChange = (date) => {
    updateDepenseData({ 
      paiement: {
        ...depenseData.paiement,
        datePaiement: date
      }
    });
  };

  // Déterminer si la référence est requise en fonction du mode de paiement
  const isReferenceRequired = ['CHEQUE', 'EFFET', 'VIREMENT'].includes(depenseData.paiement.modePaiement);
  
  // Déterminer si la banque est requise (tous sauf espèces)
  const isBanqueRequired = depenseData.paiement.modePaiement !== 'ESPECES';

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>Informations de paiement</Typography>
      
      <Grid container spacing={3}>
        {/* Statut de paiement */}
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Statut de paiement</FormLabel>
            <RadioGroup
              row
              name="statutPaiement"
              value={depenseData.paiement.statut}
              onChange={handlePaiementChange('statut')}
            >
              <FormControlLabel value="PAYEE" control={<Radio />} label="Payée" />
              <FormControlLabel value="A_PAYER" control={<Radio />} label="À payer" />
            </RadioGroup>
          </FormControl>
        </Grid>
        
        {/* Mode de paiement */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel id="mode-paiement-label">Mode de paiement</InputLabel>
            <Select
              labelId="mode-paiement-label"
              id="modePaiement"
              value={depenseData.paiement.modePaiement}
              label="Mode de paiement"
              onChange={handlePaiementChange('modePaiement')}
            >
              <MenuItem value="ESPECES">Espèces</MenuItem>
              <MenuItem value="CHEQUE">Chèque</MenuItem>
              <MenuItem value="VIREMENT">Virement</MenuItem>
              <MenuItem value="EFFET">Effet</MenuItem>
              <MenuItem value="CARTE_BANCAIRE">Carte bancaire</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {/* Date de paiement - visible uniquement si statut est PAYEE */}
        {depenseData.paiement.statut === 'PAYEE' && (
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <DatePicker
                label="Date de paiement"
                value={depenseData.paiement.datePaiement}
                onChange={handleDatePaiementChange}
                slotProps={{
                  textField: { fullWidth: true, required: true }
                }}
              />
            </LocalizationProvider>
          </Grid>
        )}
        
        {/* Référence - visible pour chèque, effet, virement */}
        {isReferenceRequired && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              id="reference"
              label="Référence"
              value={depenseData.paiement.reference}
              onChange={(e) => updateDepenseData({ 
                paiement: { ...depenseData.paiement, reference: e.target.value }
              })}
              helperText={`Numéro de ${depenseData.paiement.modePaiement.toLowerCase()}`}
            />
          </Grid>
        )}
        
        {/* Banque - visible pour tous sauf espèces */}
        {isBanqueRequired && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              id="banque"
              label="Banque"
              value={depenseData.paiement.banque}
              onChange={(e) => updateDepenseData({ 
                paiement: { ...depenseData.paiement, banque: e.target.value }
              })}
            />
          </Grid>
        )}
        
        {/* Notes sur le paiement */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="notesPaiement"
            label="Notes sur le paiement"
            multiline
            rows={2}
            value={depenseData.notes}
            onChange={(e) => updateDepenseData({ notes: e.target.value })}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default PaiementStep;