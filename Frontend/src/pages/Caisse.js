
// caissePage.js - Gestion CRUD des caisses

import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, CircularProgress, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import config from '../config';
import apiClient from '../utils/apiClient';

export default function CaissePage() {
  const [caisses, setCaisses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCaisse, setSelectedCaisse] = useState(null);
  const [formData, setFormData] = useState({
    semaine: '', annee: '', dateDebut: '', dateFin: '',
    soldeInitial: '', soldeFinale: '', entrees: [], sorties: []
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Charger les caisses
  const fetchCaisses = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/caisses') ;
      setCaisses(res.data);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur chargement caisses", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaisses();
  }, []);

  const handleOpenDialog = (caisse = null) => {
    setSelectedCaisse(caisse);
    if (caisse) {
      setFormData({
        semaine: caisse.semaine || '',
        annee: caisse.annee || '',
        dateDebut: caisse.dateDebut ? caisse.dateDebut.substring(0, 10) : '',
        dateFin: caisse.dateFin ? caisse.dateFin.substring(0, 10) : '',
        soldeInitial: caisse.soldeInitial || '',
        soldeFinale: caisse.soldeFinale || '',
        entrees: caisse.entrees || [],
        sorties: caisse.sorties || []
      });
    } else {
      setFormData({
        semaine: '', annee: '', dateDebut: '', dateFin: '',
        soldeInitial: '', soldeFinale: '', entrees: [], sorties: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCaisse(null);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      if (selectedCaisse) {
        await axios.put(`${config.backendURL}/caisses/${selectedCaisse._id}`, formData);
        setSnackbar({ open: true, message: "Caisse modifiée", severity: "success" });
      } else {
        await axios.post('/api/caisses', formData);
        setSnackbar({ open: true, message: "Caisse ajoutée", severity: "success" });
      }
      handleCloseDialog();
      fetchCaisses();
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur d'enregistrement", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cette caisse ?")) {
      try {
        await axios.delete(`${config.backendURL}/caisses/${id}`);
        setSnackbar({ open: true, message: "Caisse supprimée", severity: "success" });
        fetchCaisses();
      } catch (error) {
        console.error(error);
        setSnackbar({ open: true, message: "Erreur suppression", severity: "error" });
      }
    }
  };

  const columns = [
    { field: 'semaine', headerName: 'Semaine', width: 100 },
    { field: 'annee', headerName: 'Année', width: 100 },
    { field: 'dateDebut', headerName: 'Date Début', width: 150, valueGetter: (params) => new Date(params.row.dateDebut).toLocaleDateString() },
    { field: 'dateFin', headerName: 'Date Fin', width: 150, valueGetter: (params) => new Date(params.row.dateFin).toLocaleDateString() },
    { field: 'soldeInitial', headerName: 'Solde Initial (TND)', width: 150 },
    { field: 'soldeFinale', headerName: 'Solde Final (TND)', width: 150 },
    {
      field: 'actions', headerName: 'Actions', width: 150, renderCell: (params) => (
        <Box>
          <Tooltip title="Modifier">
            <IconButton color="primary" onClick={() => handleOpenDialog(params.row)}>
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton color="error" onClick={() => handleDelete(params.row._id)}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Gestion des Caisses</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Ajouter
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>
      ) : (
        <DataGrid
          rows={caisses}
          columns={columns}
          getRowId={(row) => row._id}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20]}
          disableSelectionOnClick
        />
      )}

      {/* Modal Ajouter/Modifier */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{selectedCaisse ? "Modifier Caisse" : "Ajouter Caisse"}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Semaine" name="semaine" type="number" value={formData.semaine} onChange={handleChange} fullWidth />
          <TextField label="Année" name="annee" type="number" value={formData.annee} onChange={handleChange} fullWidth />
          <TextField label="Date Début" name="dateDebut" type="date" value={formData.dateDebut} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Date Fin" name="dateFin" type="date" value={formData.dateFin} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Solde Initial" name="soldeInitial" type="number" value={formData.soldeInitial} onChange={handleChange} fullWidth />
          <TextField label="Solde Final" name="soldeFinale" type="number" value={formData.soldeFinale} onChange={handleChange} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">{selectedCaisse ? "Modifier" : "Ajouter"}</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Notification */}
      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        autoHideDuration={3000}
        message={snackbar.message}
      />
    </Box>
  );
}