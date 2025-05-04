// ClientsPage.js - Gestion CRUD des Clients

import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, CircularProgress
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';
import config from '../config';
import apiClient from '../utils/apiClient';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({ nom: '', adresse: '', telephone: '', email: '', matriculeFiscal: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Charger les clients
  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`${config.backendURL}/clients`);
      setClients(res.data);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur de chargement", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenDialog = (client = null) => {
    setSelectedClient(client);
    if (client) {
      setFormData({
        nom: client.nom || '',
        adresse: client.adresse || '',
        telephone: client.telephone || '',
        email: client.email || '',
        matriculeFiscal: client.matriculeFiscal || ''
      });
    } else {
      setFormData({ nom: '', adresse: '', telephone: '', email: '', matriculeFiscal: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedClient(null);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

const handleSave = async () => {
  try {
    if (selectedClient) {
      await axios.put(`${config.backendURL}/clients/${selectedClient._id}`, formData);
      setSnackbar({ open: true, message: "Client modifié avec succès", severity: "success" });
    } else {
      await axios.post(`${config.backendURL}/clients`, formData);
      setSnackbar({ open: true, message: "Client ajouté avec succès", severity: "success" });
    }
    handleCloseDialog();
    fetchClients();
  } catch (error) {
    console.error("Erreur API Client:", error.response?.data || error.message);
    setSnackbar({
      open: true,
      message: error.response?.data?.message || "Erreur lors de l'enregistrement",
      severity: "error"
    });
  }
};

  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous supprimer ce client ?")) {
      try {
        await axios.delete(`${config.backendURL}/clients/${id}`);
        setSnackbar({ open: true, message: "Client supprimé", severity: "success" });
        fetchClients();
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
    { field: 'matriculeFiscal', headerName: 'Matricule Fiscale', flex: 1 },
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
        <Typography variant="h4">Gestion des Clients</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Ajouter
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>
      ) : (
        <DataGrid
          rows={clients}
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
        <DialogTitle>{selectedClient ? "Modifier Client" : "Ajouter Client"}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Nom" name="nom" value={formData.nom} onChange={handleChange} fullWidth />
          <TextField label="Adresse" name="adresse" value={formData.adresse} onChange={handleChange} fullWidth />
          <TextField label="Téléphone" name="telephone" value={formData.telephone} onChange={handleChange} fullWidth />
          <TextField label="Email" name="email" value={formData.email} onChange={handleChange} fullWidth />
          <TextField label="Matricule Fiscale" name="matriculeFiscal" value={formData.matriculeFiscal} onChange={handleChange} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">{selectedClient ? "Modifier" : "Ajouter"}</Button>
        </DialogActions>
      </Dialog>

      {/* Notifications Snackbar */}
      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        autoHideDuration={3000}
        message={snackbar.message}
      />
    </Box>
  );
}
