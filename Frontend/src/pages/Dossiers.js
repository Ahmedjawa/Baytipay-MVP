// DossiersPage.js - Gestion CRUD des Dossiers

import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, CircularProgress, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import config from '../config';

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [formData, setFormData] = useState({
    titre: '', description: '', montantTotal: '', partieId: '', statut: 'en cours'
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Charger dossiers + clients/fournisseurs
  const fetchDossiers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config.backendURL}/dossiers`);
      setDossiers(res.data);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur chargement dossiers", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const res = await axios.get(`${config.backendURL}/clients`); // suppose qu'on charge clients et fournisseurs
      setParties(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDossiers();
    fetchParties();
  }, []);

  const handleOpenDialog = (dossier = null) => {
    setSelectedDossier(dossier);
    if (dossier) {
      setFormData({
        titre: dossier.titre || '',
        description: dossier.description || '',
        montantTotal: dossier.montantTotal || '',
        partieId: dossier.partieId?._id || '',
        statut: dossier.statut || 'en cours',
      });
    } else {
      setFormData({
        titre: '', description: '', montantTotal: '', partieId: '', statut: 'en cours'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDossier(null);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      if (selectedDossier) {
       await axios.put(`${config.backendURL}/dossiers/${selectedDossier._id}`, formData);
        setSnackbar({ open: true, message: "Dossier modifié", severity: "success" });
      } else {
        await axios.post('/api/dossiers', formData);
        setSnackbar({ open: true, message: "Dossier ajouté", severity: "success" });
      }
      handleCloseDialog();
      fetchDossiers();
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur d'enregistrement", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer ce dossier ?")) {
      try {
        await axios.delete(`${config.backendURL}/dossiers/${id}`);
        setSnackbar({ open: true, message: "Dossier supprimé", severity: "success" });
        fetchDossiers();
      } catch (error) {
        console.error(error);
        setSnackbar({ open: true, message: "Erreur suppression", severity: "error" });
      }
    }
  };

  const columns = [
    { field: 'titre', headerName: 'Titre', flex: 1 },
    { field: 'description', headerName: 'Description', flex: 1 },
    { field: 'montantTotal', headerName: 'Montant Total', flex: 1 },
    { field: 'partie', headerName: 'Partie', flex: 1, valueGetter: (params) => params.row.partieId?.nom || '-' },
    { field: 'statut', headerName: 'Statut', flex: 1 },
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
        <Typography variant="h4">Gestion des Dossiers</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Ajouter
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>
      ) : (
        <DataGrid
          rows={dossiers}
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
        <DialogTitle>{selectedDossier ? "Modifier Dossier" : "Ajouter Dossier"}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Titre" name="titre" value={formData.titre} onChange={handleChange} fullWidth />
          <TextField label="Description" name="description" value={formData.description} onChange={handleChange} fullWidth />
          <TextField label="Montant Total" name="montantTotal" type="number" value={formData.montantTotal} onChange={handleChange} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Partie (Client/Fournisseur)</InputLabel>
            <Select
              name="partieId"
              value={formData.partieId}
              onChange={handleChange}
              label="Partie"
            >
              {parties.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.nom}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Statut</InputLabel>
            <Select name="statut" value={formData.statut} onChange={handleChange} label="Statut">
              <MenuItem value="en cours">En cours</MenuItem>
              <MenuItem value="terminé">Terminé</MenuItem>
              <MenuItem value="annulé">Annulé</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">{selectedDossier ? "Modifier" : "Ajouter"}</Button>
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
