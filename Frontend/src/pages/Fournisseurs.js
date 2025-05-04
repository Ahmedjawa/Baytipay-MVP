import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, CircularProgress
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import config from '../config';

export default function FournisseursPage() {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [formData, setFormData] = useState({ nom: '', adresse: '', telephone: '', email: '', matriculeFiscale: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchFournisseurs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config.backendURL}/fournisseurs`);
      setFournisseurs(res.data);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur de chargement", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const handleOpenDialog = (fournisseur = null) => {
    setSelectedFournisseur(fournisseur);
    if (fournisseur) {
      setFormData({
        nom: fournisseur.nom || '',
        adresse: fournisseur.adresse || '',
        telephone: fournisseur.telephone || '',
        email: fournisseur.email || '',
        matriculeFiscale: fournisseur.matriculeFiscale || ''
      });
    } else {
      setFormData({ nom: '', adresse: '', telephone: '', email: '', matriculeFiscale: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFournisseur(null);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      if (selectedFournisseur) {
        await axios.put(`${config.backendURL}/fournisseurs/${selectedFournisseur._id}`, formData);
        setSnackbar({ open: true, message: "Fournisseur modifié", severity: "success" });
      } else {
        await axios.post(`${config.backendURL}/fournisseurs` , formData);
        setSnackbar({ open: true, message: "Fournisseur ajouté", severity: "success" });
      }
      handleCloseDialog();
      fetchFournisseurs();
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur d'enregistrement", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous supprimer ce fournisseur ?")) {
      try {
        await axios.delete(`${config.backendURL}/fournisseurs${id}`);
        setSnackbar({ open: true, message: "Fournisseur supprimé", severity: "success" });
        fetchFournisseurs();
      } catch (error) {
        console.error(error);
        setSnackbar({ open: true, message: "Erreur de suppression", severity: "error" });
      }
    }
  };

  const columns = [
    { field: 'nom', headerName: 'Nom', flex: 1 },
    { field: 'adresse', headerName: 'Adresse', flex: 1 },
    { field: 'telephone', headerName: 'Téléphone', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'matriculeFiscale', headerName: 'Matricule Fiscale', flex: 1 },
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
        <Typography variant="h4">Gestion des Fournisseurs</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Ajouter
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>
      ) : (
        <DataGrid
          rows={fournisseurs}
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
        <DialogTitle>{selectedFournisseur ? "Modifier Fournisseur" : "Ajouter Fournisseur"}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Nom" name="nom" value={formData.nom} onChange={handleChange} fullWidth />
          <TextField label="Adresse" name="adresse" value={formData.adresse} onChange={handleChange} fullWidth />
          <TextField label="Téléphone" name="telephone" value={formData.telephone} onChange={handleChange} fullWidth />
          <TextField label="Email" name="email" value={formData.email} onChange={handleChange} fullWidth />
          <TextField label="Matricule Fiscale" name="matriculeFiscale" value={formData.matriculeFiscale} onChange={handleChange} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">{selectedFournisseur ? "Modifier" : "Ajouter"}</Button>
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