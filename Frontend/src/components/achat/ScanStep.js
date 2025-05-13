import React, { useState } from 'react';
import { 
  Button, Grid, Card, CardContent, Typography, TextField, 
  Box, CircularProgress, IconButton, CardMedia, FormControl,
  InputLabel, MenuItem, Select, FormHelperText
} from '@mui/material';
import { 
  CloudUpload, Delete, Edit, Check, Close, 
  DataSaverOn, ViewQuilt, ZoomIn 
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { fr } from 'date-fns/locale';

export default function ScanStep({ achatData, updateAchatData }) {
  const [processing, setProcessing] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [errorMessages, setErrorMessages] = useState({});

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setProcessing(true);
    
    try {
      // Simuler la reconnaissance IA (dans un cas réel, ce serait un appel API)
      const newScans = await Promise.all(files.map(async (file) => {
        // Simuler un délai pour l'analyse IA
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Générer des données simulées de reconnaissance IA
        const simulatedData = {
          montant: (Math.random() * 1000).toFixed(2),
          dateEcheance: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
          numero: Math.random().toString(36).substr(2, 9).toUpperCase(),
          banque: ["BNP Paribas", "Société Générale", "Crédit Agricole", "Crédit Mutuel"][Math.floor(Math.random() * 4)],
          type: achatData.modePaiement === 'cheque' || achatData.modePaiement === 'cheques_multiples' ? 'CHEQUE' : 'EFFET'
        };
        
        return {
          file,
          fileName: file.name,
          preview: URL.createObjectURL(file),
          data: simulatedData,
          status: 'recognized' // 'processing', 'recognized', 'validated'
        };
      }));
      
      const updatedScans = [...(achatData.scans || []), ...newScans];
      updateAchatData({ ...achatData, scans: updatedScans });
      
      // Mettre à jour l'échéancier automatiquement si c'est le bon type de paiement
      if (['cheques_multiples', 'effets_multiples'].includes(achatData.modePaiement)) {
        updateEcheancierFromScans(updatedScans);
      }
    } catch (error) {
      console.error("Erreur lors du traitement des fichiers:", error);
    } finally {
      setProcessing(false);
    }
  };

  const updateEcheancierFromScans = (scans) => {
    const echeancier = scans.map(scan => ({
      dateEcheance: scan.data.dateEcheance,
      montant: parseFloat(scan.data.montant),
      reference: scan.data.numero,
      banque: scan.data.banque,
      type: scan.data.type,
      notes: `Document scanné: ${scan.fileName}`
    }));
    
    updateAchatData({ ...achatData, echeancier });
  };

  const handleEditScan = (index) => {
    setEditingIndex(index);
  };

  const handleSaveScan = (index) => {
    const scan = achatData.scans[index];
    const errors = {};
    
    // Validation
    if (!scan.data.montant || isNaN(parseFloat(scan.data.montant)) || parseFloat(scan.data.montant) <= 0) {
      errors.montant = "Montant invalide";
    }
    
    if (!scan.data.dateEcheance) {
      errors.dateEcheance = "Date d'échéance requise";
    }
    
    if (!scan.data.numero || scan.data.numero.trim() === '') {
      errors.numero = "Numéro requis";
    }
    
    if (Object.keys(errors).length > 0) {
      setErrorMessages({...errorMessages, [index]: errors});
      return;
    }
    
    setErrorMessages({...errorMessages, [index]: {}});
    scan.status = 'validated';
    setEditingIndex(-1);
    
    // Mettre à jour l'échéancier si nécessaire
    if (['cheques_multiples', 'effets_multiples'].includes(achatData.modePaiement)) {
      updateEcheancierFromScans(achatData.scans);
    }
  };

  const handleDeleteScan = (index) => {
    const updatedScans = [...achatData.scans];
    updatedScans.splice(index, 1);
    updateAchatData({ ...achatData, scans: updatedScans });
    
    // Mettre à jour l'échéancier si nécessaire
    if (['cheques_multiples', 'effets_multiples'].includes(achatData.modePaiement)) {
      updateEcheancierFromScans(updatedScans);
    }
  };

  const handleChange = (index, field, value) => {
    const updatedScans = [...achatData.scans];
    updatedScans[index].data[field] = value;
    updateAchatData({ ...achatData, scans: updatedScans });
  };

  const getErrorMessage = (index, field) => {
    return errorMessages[index] && errorMessages[index][field] ? errorMessages[index][field] : null;
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Scan des pièces de paiement
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Scannez les chèques ou effets pour une reconnaissance automatique des informations.
          Vérifiez et corrigez les données reconnues si nécessaire.
        </Typography>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <input
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          id="scan-upload"
          type="file"
          multiple
          onChange={handleFileUpload}
        />
        <label htmlFor="scan-upload">
          <Button 
            variant="contained" 
            component="span" 
            startIcon={<CloudUpload />}
            disabled={processing}
          >
            {processing ? 'Traitement en cours...' : 'Scanner/Importer des documents'}
          </Button>
        </label>
        {processing && <CircularProgress size={24} sx={{ ml: 2 }} />}
      </Box>

      <Grid container spacing={3}>
        {achatData.scans && achatData.scans.map((scan, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card elevation={3}>
              <CardMedia
                component="img"
                sx={{ height: 140, objectFit: 'contain', bgcolor: 'grey.100' }}
                image={scan.preview}
                alt={`Document #${index + 1}`}
              />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    {scan.data.type === 'CHEQUE' ? 'Chèque' : 'Effet'} #{index + 1}
                  </Typography>
                  <Box>
                    {editingIndex === index ? (
                      <>
                        <IconButton 
                          size="small" 
                          color="success" 
                          onClick={() => handleSaveScan(index)}
                        >
                          <Check />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => setEditingIndex(-1)}
                        >
                          <Close />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleEditScan(index)}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteScan(index)}
                        >
                          <Delete />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Box>

                {editingIndex === index ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Montant"
                        value={scan.data.montant}
                        onChange={(e) => handleChange(index, 'montant', e.target.value)}
                        InputProps={{ endAdornment: '€' }}
                        error={!!getErrorMessage(index, 'montant')}
                        helperText={getErrorMessage(index, 'montant')}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                        <DatePicker
                          label="Date d'échéance"
                          value={scan.data.dateEcheance}
                          onChange={(newValue) => handleChange(index, 'dateEcheance', newValue)}
                          renderInput={(params) => (
                            <TextField 
                              fullWidth 
                              {...params} 
                              error={!!getErrorMessage(index, 'dateEcheance')}
                              helperText={getErrorMessage(index, 'dateEcheance')}
                            />
                          )}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Numéro"
                        value={scan.data.numero}
                        onChange={(e) => handleChange(index, 'numero', e.target.value)}
                        error={!!getErrorMessage(index, 'numero')}
                        helperText={getErrorMessage(index, 'numero')}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Banque"
                        value={scan.data.banque}
                        onChange={(e) => handleChange(index, 'banque', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={scan.data.type}
                          label="Type"
                          onChange={(e) => handleChange(index, 'type', e.target.value)}
                        >
                          <MenuItem value="CHEQUE">Chèque</MenuItem>
                          <MenuItem value="EFFET">Effet</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                ) : (
                  <Box>
                    <Typography variant="body1">
                      <strong>Montant:</strong> {parseFloat(scan.data.montant).toFixed(2)} €
                    </Typography>
                    <Typography variant="body1">
                      <strong>Échéance:</strong> {scan.data.dateEcheance instanceof Date 
                        ? scan.data.dateEcheance.toLocaleDateString('fr-FR') 
                        : 'Date invalide'}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Numéro:</strong> {scan.data.numero}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Banque:</strong> {scan.data.banque || 'Non spécifiée'}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Type:</strong> {scan.data.type === 'CHEQUE' ? 'Chèque' : 'Effet'}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color={
                        scan.status === 'processing' ? 'warning.main' : 
                        scan.status === 'validated' ? 'success.main' : 
                        'info.main'
                      }>
                        {scan.status === 'processing' ? 'En cours de traitement' : 
                         scan.status === 'validated' ? 'Validé' : 
                         'Reconnu - À valider'}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {achatData.scans && achatData.scans.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body1" color="text.secondary">
            Aucun document scanné. Utilisez le bouton ci-dessus pour scanner ou importer des documents.
          </Typography>
        </Box>
      )}
    </Box>
  );
}