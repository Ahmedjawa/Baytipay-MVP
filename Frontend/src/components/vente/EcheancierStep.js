import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Grid, Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Add as AddIcon, Delete, Edit, CalendarToday, Save } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import fr from 'date-fns/locale/fr';

/**
 * Composant pour gérer l'échéancier de paiement
 * @param {Object} props Propriétés du composant
 * @param {Object} props.venteData Données de la vente
 * @param {Function} props.updateVenteData Fonction pour mettre à jour les données de la vente
 */
function EcheancierStep({ venteData, updateVenteData }) {
  const [nouvelleEcheance, setNouvelleEcheance] = useState({
    dateEcheance: new Date(),
    montant: '',
    reference: '',
    banque: '',
    type: venteData.modePaiement === 'effets_multiples' ? 'EFFET' : 'CHEQUE'
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [nombreEcheances, setNombreEcheances] = useState(3);
  const [nombreEcheancesInput, setNombreEcheancesInput] = useState('3');
  const [notes, setNotes] = useState(venteData.notesEcheancier || '');

  // Mettre à jour les notes dans les données de vente
  useEffect(() => {
    updateVenteData({ notesEcheancier: notes });
  }, [notes]);

  // Calculer le montant restant à répartir
  const totalRestant = () => {
    const totalEcheances = venteData.echeancier.reduce((sum, item) => sum + parseFloat(item.montant || 0), 0);
    
    // Si mode de paiement mixte, soustraire le montant en espèces du total
    if (venteData.modePaiement === 'mixte') {
      const montantEspeces = parseFloat(venteData.paiementDetails?.montantRecu || 0);
      return venteData.totalTTC - montantEspeces - totalEcheances;
    }
    
    return venteData.totalTTC - totalEcheances;
  };

  // Calculer le montant total de l'échéancier
  const totalEcheancier = () => {
    return venteData.echeancier.reduce((sum, item) => sum + parseFloat(item.montant || 0), 0);
  };

  // Ouvrir le dialogue pour ajouter une échéance
  const handleAddEcheance = () => {
    setNouvelleEcheance({
      dateEcheance: new Date(new Date().setDate(new Date().getDate() + 30)), // Par défaut aujourd'hui + 30 jours
      montant: totalRestant() > 0 ? totalRestant().toFixed(2) : '',
      reference: '',
      banque: '',
      type: venteData.modePaiement === 'effets_multiples' ? 'EFFET' : 'CHEQUE'
    });
    setEditIndex(-1);
    setDialogOpen(true);
  };

  // Ouvrir le dialogue pour éditer une échéance
  const handleEditEcheance = (index) => {
    setNouvelleEcheance({
      ...venteData.echeancier[index],
      dateEcheance: new Date(venteData.echeancier[index].dateEcheance)
    });
    setEditIndex(index);
    setDialogOpen(true);
  };

  // Modifier directement le montant d'une échéance dans le tableau
  const handleUpdateMontant = (index, value) => {
    const montant = parseFloat(value);
    if (isNaN(montant) || montant < 0) return;

    const updatedEcheancier = [...venteData.echeancier];
    updatedEcheancier[index].montant = montant.toFixed(2);
    
    // Ajuster automatiquement le dernier montant pour équilibrer le total
    const totalMontantDu = venteData.modePaiement === 'mixte' 
      ? venteData.totalTTC - parseFloat(venteData.paiementDetails?.montantRecu || 0)
      : venteData.totalTTC;
    
    const totalActuel = updatedEcheancier.reduce((sum, item, i) => 
      i !== updatedEcheancier.length - 1 ? sum + parseFloat(item.montant || 0) : sum, 0);
    
    const dernierMontant = totalMontantDu - totalActuel;
    
    if (index !== updatedEcheancier.length - 1 && dernierMontant >= 0) {
      updatedEcheancier[updatedEcheancier.length - 1].montant = dernierMontant.toFixed(2);
    }
    
    updateVenteData({ echeancier: updatedEcheancier });
  };

  // Supprimer une échéance
  const handleDeleteEcheance = (index) => {
    const updatedEcheancier = [...venteData.echeancier];
    updatedEcheancier.splice(index, 1);
    updateVenteData({ echeancier: updatedEcheancier });
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
      const updatedEcheancier = [...venteData.echeancier];
      updatedEcheancier[editIndex] = nouvelleEcheance;
      updateVenteData({ echeancier: updatedEcheancier });
    } else {
      // Si c'est un ajout
      updateVenteData({ 
        echeancier: [...venteData.echeancier, nouvelleEcheance] 
      });
    }
    
    setDialogOpen(false);
    setError(null);
  };

  // Générer automatiquement un échéancier équitablement réparti
  const handleGenererEcheancierAuto = () => {
    const montantRestant = venteData.modePaiement === 'mixte' 
      ? venteData.totalTTC - parseFloat(venteData.paiementDetails?.montantRecu || 0)
      : venteData.totalTTC;
      
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
        banque: venteData.paiementDetails?.banque || '',
        type: venteData.modePaiement === 'effets_multiples' ? 'EFFET' : 'CHEQUE'
      });
    }
    
    updateVenteData({ echeancier: nouvelEcheancier });
  };

  // Formater la date pour l'affichage
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  // Mettre à jour la date d'une échéance directement dans le tableau
  const handleUpdateDate = (index, newDate) => {
    const updatedEcheancier = [...venteData.echeancier];
    updatedEcheancier[index].dateEcheance = newDate;
    updateVenteData({ echeancier: updatedEcheancier });
  };

  // Mettre à jour un champ texte d'une échéance directement dans le tableau
  const handleUpdateField = (index, field, value) => {
    const updatedEcheancier = [...venteData.echeancier];
    updatedEcheancier[index][field] = value;
    updateVenteData({ echeancier: updatedEcheancier });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Échéancier de paiement</Typography>
      
      {venteData.modePaiement === 'mixte' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Montant déjà payé en espèces: {parseFloat(venteData.paiementDetails?.montantRecu || 0).toFixed(2)} €
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
      
      {/* Section de génération automatique */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Générer un échéancier automatiquement</Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Typography>
              Montant à échelonner: <strong>{
                (venteData.modePaiement === 'mixte' 
                  ? venteData.totalTTC - parseFloat(venteData.paiementDetails?.montantRecu || 0)
                  : venteData.totalTTC).toFixed(2)
              } €</strong>
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={4}>
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
          
          <Grid item xs={12} sm={4}>
            <Button 
              variant="contained" 
              onClick={handleGenererEcheancierAuto}
              fullWidth
            >
              Générer l'échéancier
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
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
        
        {venteData.echeancier.length > 0 ? (
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
                {venteData.echeancier.map((echeance, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                        <DatePicker
                          value={new Date(echeance.dateEcheance)}
                          onChange={(newDate) => handleUpdateDate(index, newDate)}
                          renderInput={(params) => <TextField {...params} size="small" />}
                          size="small"
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
                          value={echeance.type}
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
                        value={echeance.reference}
                        onChange={(e) => handleUpdateField(index, 'reference', e.target.value)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={echeance.banque}
                        onChange={(e) => handleUpdateField(index, 'banque', e.target.value)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleDeleteEcheance(index)} size="small" color="error">
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
            Aucune échéance n'a été définie. Utilisez l'outil de génération automatique ou ajoutez manuellement.
          </Alert>
        )}
      </Box>
      
      {/* Affichage du statut de l'échéancier */}
      {venteData.echeancier.length > 0 && (
        <Alert severity={
            Math.abs(totalEcheancier() - (venteData.modePaiement === 'mixte' 
              ? venteData.totalTTC - parseFloat(venteData.paiementDetails?.montantRecu || 0)
              : venteData.totalTTC)) < 0.01 
            ? "success" 
            : "warning"
          }>
          {Math.abs(totalEcheancier() - (venteData.modePaiement === 'mixte' 
            ? venteData.totalTTC - parseFloat(venteData.paiementDetails?.montantRecu || 0)
            : venteData.totalTTC)) < 0.01 
            ? "Le montant total des échéances correspond exactement au montant dû." 
            : `Attention: Il y a un écart de ${Math.abs(totalEcheancier() - (venteData.modePaiement === 'mixte' 
                ? venteData.totalTTC - parseFloat(venteData.paiementDetails?.montantRecu || 0)
                : venteData.totalTTC)).toFixed(2)} € entre le total des échéances et le montant dû.`
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
                  fullWidth
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
                    value={nouvelleEcheance.type}
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
                  value={nouvelleEcheance.reference}
                  onChange={(e) => setNouvelleEcheance({...nouvelleEcheance, reference: e.target.value})}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Banque"
                  value={nouvelleEcheance.banque}
                  onChange={(e) => setNouvelleEcheance({...nouvelleEcheance, banque: e.target.value})}
                  fullWidth
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Annuler</Button>
          <Button onClick={handleSaveEcheance} variant="contained" color="primary">Enregistrer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EcheancierStep;