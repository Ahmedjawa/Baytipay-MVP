// components/depense/InformationsStep.js
import React from 'react';
import {
  Box, Grid, TextField, Typography, FormControl,
  InputLabel, Select, MenuItem, FormControlLabel,
  Switch, InputAdornment, Autocomplete
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

function InformationsStep({ depenseData, updateDepenseData, categories, beneficiaires }) {
  const handleChange = (field) => (event) => {
    updateDepenseData({ [field]: event.target.value });
  };

  const handleDateChange = (date) => {
    updateDepenseData({ dateDepense: date });
  };

  const handleSwitchChange = (event) => {
    updateDepenseData({ estRecurrente: event.target.checked });
  };

  const handleBeneficiaireChange = (event, newValue) => {
    updateDepenseData({ beneficiaire: newValue });
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>Informations de la dépense</Typography>
      
      <Grid container spacing={3}>
        {/* Catégorie */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel id="categorie-label">Catégorie</InputLabel>
            <Select
              labelId="categorie-label"
              id="categorie"
              value={depenseData.categorie}
              label="Catégorie"
              onChange={handleChange('categorie')}
            >
              {categories.map((category) => (
                <MenuItem key={category._id} value={category._id}>
                  {category.nom}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Montant */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            id="montant"
            label="Montant"
            type="number"
            InputProps={{
              startAdornment: <InputAdornment position="start">€</InputAdornment>,
              inputProps: { min: 0, step: 0.01 }
            }}
            value={depenseData.montant}
            onChange={(e) => updateDepenseData({ montant: parseFloat(e.target.value) || 0 })}
          />
        </Grid>
        
        {/* Date de la dépense */}
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <DatePicker
              label="Date de la dépense"
              value={depenseData.dateDepense}
              onChange={handleDateChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  required
                  size="small"
                />
              )}
            />
          </LocalizationProvider>
        </Grid>
        
        {/* Bénéficiaire */}
        <Grid item xs={12} md={6}>
          <Autocomplete
            id="beneficiaire"
            options={beneficiaires}
            getOptionLabel={(option) => option.raisonSociale || `${option.prenom} ${option.nom}` || option.nom || ''}
            value={depenseData.beneficiaire}
            onChange={handleBeneficiaireChange}
            renderInput={(params) => (
              <TextField {...params} label="Bénéficiaire" fullWidth />
            )}
          />
        </Grid>
        
        {/* Description */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="description"
            label="Description"
            multiline
            rows={3}
            value={depenseData.description}
            onChange={handleChange('description')}
          />
        </Grid>
        
        {/* Option dépense récurrente */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={depenseData.estRecurrente}
                onChange={handleSwitchChange}
                name="estRecurrente"
                color="primary"
              />
            }
            label="Dépense récurrente"
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default InformationsStep;