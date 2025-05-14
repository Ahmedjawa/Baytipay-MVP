// components/depense/PeriodiciteStep.js
import React from 'react';
import {
  Box, Grid, TextField, Typography, FormControl,
  InputLabel, Select, MenuItem, FormControlLabel,
  Switch, Divider, InputAdornment, FormLabel, Radio, RadioGroup
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { 
  NotificationsActive, Alarm, Timeline,
  Email, Smartphone, Notifications
} from '@mui/icons-material';

function PeriodiciteStep({ depenseData, updateDepenseData }) {
  // Handler pour la mise à jour des champs de périodicité
  const handlePeriodiciteChange = (field) => (event) => {
    updateDepenseData({
      periodicite: {
        ...depenseData.periodicite,
        [field]: event.target.value
      }
    });
  };

  // Handler pour les dates
  const handleDateChange = (field) => (date) => {
    updateDepenseData({
      periodicite: {
        ...depenseData.periodicite,
        [field]: date
      }
    });
  };

  // Handler pour les notifications
  const handleNotificationChange = (field) => (event) => {
    updateDepenseData({
      periodicite: {
        ...depenseData.periodicite,
        notifications: {
          ...depenseData.periodicite.notifications,
          [field]: event.target.value
        }
      }
    });
  };

  // Handler pour les canaux de notification (checkboxes)
  const handleCanalChange = (canal) => (event) => {
    const currentCanaux = [...depenseData.periodicite.notifications.canaux];
    
    if (event.target.checked) {
      // Ajouter le canal s'il n'est pas déjà présent
      if (!currentCanaux.includes(canal)) {
        currentCanaux.push(canal);
      }
    } else {
      // Retirer le canal
      const index = currentCanaux.indexOf(canal);
      if (index !== -1) {
        currentCanaux.splice(index, 1);
      }
    }
    
    updateDepenseData({
      periodicite: {
        ...depenseData.periodicite,
        notifications: {
          ...depenseData.periodicite.notifications,
          canaux: currentCanaux
        }
      }
    });
  };

  // Handler pour le switch de rappels
  const handleRappelsChange = (event) => {
    updateDepenseData({
      periodicite: {
        ...depenseData.periodicite,
        notifications: {
          ...depenseData.periodicite.notifications,
          rappels: event.target.checked
        }
      }
    });
  };

  // Handler pour le type de fin de récurrence (date ou occurrences)
  const handleRecurrenceEndTypeChange = (event) => {
    const endType = event.target.value;
    
    // Réinitialiser les valeurs en fonction du type sélectionné
    if (endType === 'DATE') {
      updateDepenseData({
        periodicite: {
          ...depenseData.periodicite,
          dateFin: new Date(new Date().setMonth(new Date().getMonth() + 6)), // 6 mois par défaut
          nombreOccurrences: 0
        }
      });
    } else if (endType === 'OCCURRENCES') {
      updateDepenseData({
        periodicite: {
          ...depenseData.periodicite,
          dateFin: null,
          nombreOccurrences: 12 // 12 occurrences par défaut
        }
      });
    }
  };

  // Déterminer le type de fin de récurrence actuellement sélectionné
  const getRecurrenceEndType = () => {
    if (depenseData.periodicite.dateFin) return 'DATE';
    if (depenseData.periodicite.nombreOccurrences > 0) return 'OCCURRENCES';
    return 'DATE'; // Par défaut
  };

  // Vérifier si un canal de notification est actif
  const isCanalActive = (canal) => {
    return depenseData.periodicite.notifications.canaux.includes(canal);
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>Configuration de la périodicité</Typography>
      
      <Grid container spacing={3}>
        {/* Fréquence */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel id="frequence-label">Fréquence</InputLabel>
            <Select
              labelId="frequence-label"
              id="frequence"
              value={depenseData.periodicite.frequence}
              label="Fréquence"
              onChange={handlePeriodiciteChange('frequence')}
            >
              <MenuItem value="QUOTIDIENNE">Quotidienne</MenuItem>
              <MenuItem value="HEBDOMADAIRE">Hebdomadaire</MenuItem>
              <MenuItem value="MENSUELLE">Mensuelle</MenuItem>
              <MenuItem value="TRIMESTRIELLE">Trimestrielle</MenuItem>
              <MenuItem value="SEMESTRIELLE">Semestrielle</MenuItem>
              <MenuItem value="ANNUELLE">Annuelle</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {/* Date de début */}
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <DatePicker
              label="Date de début"
              value={depenseData.periodicite.dateDebut}
              onChange={handleDateChange('dateDebut')}
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
        
        {/* Type de fin de récurrence (date ou nombre d'occurrences) */}
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">Fin de la récurrence</FormLabel>
            <RadioGroup
              row
              name="endType"
              value={getRecurrenceEndType()}
              onChange={handleRecurrenceEndTypeChange}
            >
              <FormControlLabel value="DATE" control={<Radio />} label="Date de fin" />
              <FormControlLabel value="OCCURRENCES" control={<Radio />} label="Nombre d'occurrences" />
            </RadioGroup>
          </FormControl>
        </Grid>
        
        {/* Date de fin (conditionnelle) */}
        {getRecurrenceEndType() === 'DATE' && (
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <DatePicker
                label="Date de fin"
                value={depenseData.periodicite.dateFin}
                onChange={handleDateChange('dateFin')}
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
        )}
        
        {/* Nombre d'occurrences (conditionnel) */}
        {getRecurrenceEndType() === 'OCCURRENCES' && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              id="nombreOccurrences"
              label="Nombre d'occurrences"
              type="number"
              InputProps={{
                inputProps: { min: 1 }
              }}
              value={depenseData.periodicite.nombreOccurrences}
              onChange={(e) => updateDepenseData({
                periodicite: {
                  ...depenseData.periodicite,
                  nombreOccurrences: parseInt(e.target.value) || 0
                }
              })}
            />
          </Grid>
        )}
        
        {/* Section des notifications */}
        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <NotificationsActive sx={{ mr: 1 }} /> Configuration des notifications
          </Typography>
        </Grid>
        
        {/* Délai de préavis */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            id="delaiPreAvis"
            label="Délai de préavis"
            type="number"
            InputProps={{
              endAdornment: <InputAdornment position="end">jours avant</InputAdornment>,
              inputProps: { min: 0, max: 30 }
            }}
            value={depenseData.periodicite.notifications.delaiPreAvis}
            onChange={(e) => updateDepenseData({
              periodicite: {
                ...depenseData.periodicite,
                notifications: {
                  ...depenseData.periodicite.notifications,
                  delaiPreAvis: parseInt(e.target.value) || 0
                }
              }
            })}
            helperText="Notification x jours avant l'échéance"
          />
        </Grid>
        
        {/* Canaux de notification */}
        <Grid item xs={12}>
          <Typography variant="body2" sx={{ mb: 1 }}>Canaux de notification</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isCanalActive('APPLICATION')}
                  onChange={handleCanalChange('APPLICATION')}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Notifications sx={{ mr: 0.5 }} />
                  Application
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={isCanalActive('EMAIL')}
                  onChange={handleCanalChange('EMAIL')}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Email sx={{ mr: 0.5 }} />
                  Email
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={isCanalActive('SMS')}
                  onChange={handleCanalChange('SMS')}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Smartphone sx={{ mr: 0.5 }} />
                  SMS
                </Box>
              }
            />
          </Box>
        </Grid>
        
        {/* Rappels en cas de non-paiement */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={depenseData.periodicite.notifications.rappels}
                onChange={handleRappelsChange}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Alarm sx={{ mr: 0.5 }} />
                Rappels en cas de non-paiement
              </Box>
            }
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
            Des rappels seront envoyés 1, 3 et 7 jours après l'échéance si la dépense n'est pas marquée comme payée
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PeriodiciteStep;