// components/EtatRecapitulatifGenerator.jsx
import React, { useState } from 'react';
import { Button, Grid, MenuItem, Select, FormControl, InputLabel, Box } from '@mui/material';
import documentService from '../services/documentService';
import { toast } from 'react-toastify';

const EtatRecapitulatifGenerator = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  
  const generateReport = async () => {
    try {
      setLoading(true);
      const docBlob = await documentService.generateEtatRecapitulatifMensuel(month, year);
      const docUrl = URL.createObjectURL(docBlob);
      window.open(docUrl, '_blank');
    } catch (error) {
      console.error('Erreur génération état récapitulatif:', error);
      toast.error('Erreur lors de la génération de l\'état récapitulatif');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box p={2}>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Mois</InputLabel>
            <Select value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i+1} value={i+1}>
                  {new Date(0, i).toLocaleString('fr-FR', { month: 'long' })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Année</InputLabel>
            <Select value={year} onChange={(e) => setYear(e.target.value)}>
              {Array.from({ length: 5 }, (_, i) => (
                <MenuItem key={year-i} value={year-i}>
                  {year-i}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={generateReport}
            disabled={loading}
          >
            Générer l'état récapitulatif
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EtatRecapitulatifGenerator;