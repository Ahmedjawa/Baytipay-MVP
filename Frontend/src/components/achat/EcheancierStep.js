import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Grid, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Add as AddIcon, Delete, Edit, CalendarToday, Save, Upload } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { fr } from 'date-fns/locale';

/**
 * Composant pour gérer l'échéancier de paiement des achats
 * @param {Object} props Propriétés du composant
 * @param {Object} props.achatData Données de l'achat
 * @param {Function} props.updateAchatData Fonction pour mettre à jour les données de l'achat
 */
function EcheancierStep({ achatData, updateAchatData }) {
  const [nouvelleEcheance, setNouvelleEcheance] = useState({
    dateEcheance: new Date(),
    montant: '',
    reference: '',
    banque: '',
    type: achatData.modePaiement === 'effets_multiples' ? 'EFFET' : 'CHEQUE'
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [nombreEcheances, setNombreEcheances] = useState(3);
  const [nombreEcheancesInput, setNombreEcheancesInput] = useState('3');
  const [notes, setNotes] = useState(achatData.notesEcheancier || '');

  // Mettre à jour les notes dans les données d'achat
  useEffect(() => {
    updateAchatData({ notesEcheancier: notes });
  }, [notes]);

  // Calculer le montant restant à répartir
  const totalRestant = () => {
    const totalEcheances = achatData.echeancier.reduce((sum, item) => sum + parseFloat(item.montant || 0), 0);
    
    // Si mode de paiement mixte, soustraire le montant en espèces du total
    if (achatData.modePaiement === 'mixte') {
      const montantEspeces = parseFloat(achatData.paiementDetails?.montantRecu || 0);
      return achatData.totalTTC - montantEspeces - totalEcheances;
    }
    
    return achatData.totalTTC - totalEcheances;
  };

  // Calculer le montant total de l'échéancier
  const totalEcheancier = () => {
    return achatData.echeancier.reduce((sum, item) => sum + parseFloat(item.montant || 0), 0);
  };

  // Ouvrir le dialogue pour ajouter une échéance
  const handleAddEcheance = () => {
    setNouvelleEcheance({
      dateEcheance: new Date(new Date().setDate(new Date().getDate() + 30)), // Par défaut aujourd'hui + 30 jours
      montant: totalRestant() > 0 ? totalRestant().toFixed(2) : '',
      reference: '',
      banque: '',
      type: achatData.modePaiement === 'effets_multiples' ? 'EFFET' : 'CHEQUE'
    });
    setEditIndex(-1);
    setDialogOpen(true);
  };

  // Ouvrir le dialogue pour éditer une échéance
  const handleEditEcheance = (index) => {
    setNouvelleEcheance({
      ...achatData.echeancier[index],
      dateEcheance: new Date(achatData.echeancier[index].dateEcheance)
    });
    setEditIndex(index);
    setDialogOpen(true);
  };

  // Modifier directement le montant d'une échéance dans le tableau
  const handleUpdateMontant = (index, value) => {
    const montant = parseFloat(value);
    if (isNaN(montant) || montant < 0) return;

    const updatedEcheancier = [...achatData.echeancier];
    updatedEcheancier[index].montant = montant.toFixed(2);
    
    // Ajuster automatiquement le dernier montant pour équilibrer le total
    const totalMontantDu = achatData.modePaiement === 'mixte' 
      ? achatData.totalTTC - parseFloat(achatData.paiementDetails?.montantRecu || 0)
      : achatData.totalTTC;
    
    const totalActuel = updatedEcheancier.reduce((sum, item, i) => 
      i !== updatedEcheancier.length - 1 ? sum + parseFloat(item.montant || 0) : sum, 0);
    
    const dernierMontant = totalMontantDu - totalActuel;
    
    if (index !== updatedEcheancier.length - 1 && dernierMontant >= 0) {
      updatedEcheancier[updatedEcheancier.length - 1].montant = dernierMontant.toFixed(2);
    }
    
    updateAchatData({ echeancier: updatedEcheancier });
  };

  // Supprimer une échéance
  const handleDeleteEcheance = (index) => {
    const updatedEcheancier = [...achatData.echeancier];
    updatedEcheancier.splice(index, 1);
    updateAchatData({ echeancier: updatedEcheancier });
  };

  // Enregistrer une échéance (ajout ou mise à jour)
  const handleSaveEcheance = () => {
    // Validation
    if (!nouvelleEcheance.dateEcheance) {
      setError('La date d\'échéance est obligatoire');
      return;
    }
    
    const montant = parseFloat(nouvelleEcheance.montant);
    if (isNaN(montant) || montant <= 0) {
      setError('Le montant doit être un nombre positif');
      return;
    }

    // Si c'est une édition
    if (editIndex >= 0) {
      const updatedEcheancier = [...achatData.echeancier];
      updatedEcheancier[editIndex] = nouvelleEcheance;
      updateAchatData({ echeancier: updatedEcheancier });
    } else {
      // Si c'est un ajout
      updateAchatData({ 
        echeancier: [...achatData.echeancier, nouvelleEcheance] 
      });
    }
    
    setDialogOpen(false);
    setError(null);
  };

  // Générer automatiquement un échéancier à partir des scans
  const handleGenererEcheancierFromScans = () => {
    if (!achatData.scans || achatData.scans.length === 0) {
      setError('Aucun document scanné disponible. Veuillez d\'abord scanner vos documents.');
      return;
    }
    
    // Créer un échéancier à partir des informations des scans
    const nouvelEcheancier = achatData.scans.map(scan => ({
      dateEcheance: scan.data.dateEcheance,
      montant: parseFloat(scan.data.montant).toFixed(2),
      reference: scan.data.numero,
      banque: scan.data.banque || '',
      type: scan.data.type || 'CHEQUE',
      notes: `Document scanné: ${scan.fileName}`
    }));
    
    updateAchatData({ echeancier: nouvelEcheancier });
    
    // Vérifier si la somme correspond au total dû
    const totalScans = nouvelEcheancier.reduce((sum, item) => sum + parseFloat(item.montant), 0);
    const totalDu = achatData.modePaiement === 'mixte'
      ? achatData.totalTTC - parseFloat(achatData.paiementDetails?.montantRecu || 0)
      : achatData.totalTTC;
    
    if (Math.abs(totalScans - totalDu) > 0.01) {
      setError(`Attention: Le total des documents scannés (${totalScans.toFixed(2)}€) ne correspond pas au montant dû (${totalDu.toFixed(2)}€)`);
    } else {
      setError(null);
    }
  };

  // Générer automatiquement un échéancier équitablement réparti
  const handleGenererEcheancierAuto = () => {
    const montantRestant = achatData.modePaiement === 'mixte' 
      ? achatData.totalTTC - parseFloat(achatData.paiementDetails?.montantRecu || 0)
      : achatData.totalTTC;
      
    if (montantRestant <= 0) {
      setError('Montant insuffisant pour générer un échéancier');
      return;
    }
    
    // Calcul de l'échéancier avec des montants entiers (sans décimales) sauf pour la dernière échéance
    const montantParMensualite = Math.floor(montantRestant / nombreEcheances);
    const nouvelEcheancier = [];
    const today = new Date();
    
    let totalCalcule = 0;
    
    for (let i = 0; i < nombreEcheances; i++) {
      const dateEcheance = new Date(today);
      dateEcheance.setMonth(today.getMonth() + i + 1);
      
      // Calculer le montant pour cette échéance
      let montant;
      if (i === nombreEcheances - 1) {
        // Pour la dernière échéance, utiliser le montant restant exact pour équilibrer le total
        montant = (montantRestant - totalCalcule).toFixed(2);
      } else {
        montant = montantParMensualite;
        totalCalcule += montantParMensualite;
      }
        
      // Créer l'échéance
      nouvelEcheancier.push({
        dateEcheance: new Date(dateEcheance),
        montant: montant.toString(),
        reference: `ECH-${i+1}/${nombreEcheances}`,
        banque: achatData.paiementDetails?.banque || '',
        type: achatData.modePaiement === 'effets_multiples' ? 'EFFET' : 'CHEQUE'
      });
    }
    
    updateAchatData({ echeancier: nouvelEcheancier });
  };

  // Mettre à jour la date d'une échéance directement dans le tableau
  const handleUpdateDate = (index, newDate) => {
    const updatedEcheancier = [...achatData.echeancier];
    updatedEcheancier[index].dateEcheance = newDate;
    updateAchatData({ echeancier: updatedEcheancier });
  };

  // Mettre à jour un champ texte d'une échéance directement dans le tableau
  const handleUpdateField = (index, field, value) => {
    const updatedEcheancier = [...achatData.echeancier];
    updatedEcheancier[index][field] = value;
    updateAchatData({ echeancier: updatedEcheancier });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Échéancier de paiement</Typography>
      
      {achatData.modePaiement === 'mixte' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Montant déjà payé en espèces: {parseFloat(achatData.paiementDetails?.montantRecu || 0).toFixed(2)} €
        </Alert>
      )}
      
      {/* Section des notes générales pour l'échéancier */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Notes générales sur l'échéancier"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
      </Box>
      
      {/* Options de génération d'échéancier */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Option 1: Générer à partir des scans */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Option 1: Utiliser les documents scannés</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Créer automatiquement l'échéancier à partir des informations reconnues dans les documents scannés.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<Upload />}
              onClick={handleGenererEcheancierFromScans}
              fullWidth
              disabled={!achatData.scans || achatData.scans.length === 0}
            >
              Générer depuis les {achatData.scans ? achatData.scans.length : 0} documents scannés
            </Button>
            {(!achatData.scans || achatData.scans.length === 0) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Aucun document scanné disponible. Veuillez d'abord scanner vos documents.
              </Typography>
            )}
          </Paper>
        </Grid>
        
        {/* Option 2: Générer automatiquement */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>Option 2: Générer un échéancier mensuel</Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Montant à échelonner: <strong>{
                    (achatData.modePaiement === 'mixte' 
                      ? achatData.totalTTC - parseFloat(achatData.paiementDetails?.montantRecu || 0)
                      : achatData.totalTTC).toFixed(2)
                  } €</strong>
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={7}>
                <TextField
                  label="Nombre d'échéances"
                  type="number"
                  value={nombreEcheancesInput}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setNombreEcheancesInput(e.target.value);
                    if (val >= 1) {
                      setNombreEcheances(val);
                    }
                  }}
                  fullWidth
                  inputProps={{ min: 1 }}
                  helperText="Nombre entier positif uniquement"
                />
              </Grid>
              
              <Grid item xs={12} sm={5}>
                <Button 
                  variant="contained" 
                  onClick={handleGenererEcheancierAuto}
                  fullWidth
                >
                  Générer
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Tableau des échéances */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Échéances de paiement</span>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={handleAddEcheance}
            size="small"
          >
            Ajouter manuellement
          </Button>
        </Typography>
        
        {achatData.echeancier && achatData.echeancier.length > 0 ? (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date d'échéance</TableCell>
                  <TableCell>Montant (€)</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Référence</TableCell>
                  <TableCell>Banque</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {achatData.echeancier.map((echeance, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                        <DatePicker
                          value={new Date(echeance.dateEcheance)}
                          onChange={(newDate) => handleUpdateDate(index, newDate)}
                          renderInput={(params) => <TextField {...params} size="small" />}
                        />
                      </LocalizationProvider>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={echeance.montant}
                        onChange={(e) => handleUpdateMontant(index, e.target.value)}
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ width: '100px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={echeance.type || 'CHEQUE'}
                          onChange={(e) => handleUpdateField(index, 'type', e.target.value)}
                          size="small"
                        >
                          <MenuItem value="CHEQUE">Chèque</MenuItem>
                          <MenuItem value="EFFET">Effet</MenuItem>
                          <MenuItem value="VIREMENT">Virement</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={echeance.reference || ''}
                        onChange={(e) => handleUpdateField(index, 'reference', e.target.value)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={echeance.banque || ''}
                        onChange={(e) => handleUpdateField(index, 'banque', e.target.value)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        onClick={() => handleEditEcheance(index)} 
                        size="small" 
                        color="primary"
                        sx={{ mr: 1 }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        onClick={() => handleDeleteEcheance(index)} 
                        size="small" 
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={1} sx={{ fontWeight: 'bold' }}>TOTAL</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    {totalEcheancier().toFixed(2)} €
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            Aucune échéance n'a été définie. Utilisez l'une des méthodes de génération ci-dessus ou ajoutez manuellement.
          </Alert>
        )}
      </Box>
      
      {/* Affichage du statut de l'échéancier */}
      {achatData.echeancier && achatData.echeancier.length > 0 && (
        <Alert severity={
            Math.abs(totalEcheancier() - (achatData.modePaiement === 'mixte' 
              ? achatData.totalTTC - parseFloat(achatData.paiementDetails?.montantRecu || 0)
              : achatData.totalTTC)) < 0.01 
            ? "success" 
            : "warning"
          }>
          {Math.abs(totalEcheancier() - (achatData.modePaiement === 'mixte' 
            ? achatData.totalTTC - parseFloat(achatData.paiementDetails?.montantRecu || 0)
            : achatData.totalTTC)) < 0.01 
            ? "Le montant total des échéances correspond exactement au montant dû." 
            : `Attention: Il y a un écart de ${Math.abs(totalEcheancier() - (achatData.modePaiement === 'mixte' 
                ? achatData.totalTTC - parseFloat(achatData.paiementDetails?.montantRecu || 0)
                : achatData.totalTTC)).toFixed(2)} € entre le total des échéances et le montant dû.`
          }
        </Alert>
      )}
      
      {/* Dialog pour ajouter/modifier une échéance */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editIndex >= 0 ? 'Modifier l\'échéance' : 'Ajouter une échéance'}</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date d'échéance"
                  value={nouvelleEcheance.dateEcheance}
                  onChange={(newDate) => setNouvelleEcheance({...nouvelleEcheance, dateEcheance: newDate})}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Montant"
                  type="number"
                  value={nouvelleEcheance.montant}
                  onChange={(e) => setNouvelleEcheance({...nouvelleEcheance, montant: e.target.value})}
                  fullWidth
                  required
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={nouvelleEcheance.type || 'CHEQUE'}
                    onChange={(e) => setNouvelleEcheance({...nouvelleEcheance, type: e.target.value})}
                    label="Type"
                  >
                    <MenuItem value="CHEQUE">Chèque</MenuItem>
                    <MenuItem value="EFFET">Effet</MenuItem>
                    <MenuItem value="VIREMENT">Virement</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Référence"
                  value={nouvelleEcheance.reference || ''}
                  onChange={(e) => setNouvelleEcheance({...nouvelleEcheance, reference: e.target.value})}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Banque"
                  value={nouvelleEcheance.banque || ''}
                  onChange={(e) => setNouvelleEcheance({...nouvelleEcheance, banque: e.target.value})}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  value={nouvelleEcheance.notes || ''}
                  onChange={(e) => setNouvelleEcheance({...nouvelleEcheance, notes: e.target.value})}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDialogOpen(false);
            setError(null);
          }} color="inherit">
            Annuler
          </Button>
          <Button onClick={handleSaveEcheance} variant="contained" color="primary">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EcheancierStep;