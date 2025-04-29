// TransactionsPage.js - Gestion CRUD des Transactions

import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, CircularProgress, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Add, Edit, Delete } from '@mui/icons-material';
import axios from 'axios';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [formData, setFormData] = useState({
    type: 'traite', montant: '', dateEcheance: '', statut: 'à payer',
    dossierId: '', numeroReference: '', notesSupplementaires: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Charger les transactions + dossiers
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/transactions');
      setTransactions(res.data);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur chargement transactions", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchDossiers = async () => {
    try {
      const res = await axios.get('/api/dossiers');
      setDossiers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchDossiers();
  }, []);

  const handleOpenDialog = (transaction = null) => {
    setSelectedTransaction(transaction);
    if (transaction) {
      setFormData({
        type: transaction.type || 'traite',
        montant: transaction.montant || '',
        dateEcheance: transaction.dateEcheance ? transaction.dateEcheance.substring(0, 10) : '',
        statut: transaction.statut || 'à payer',
        dossierId: transaction.dossierId?._id || '',
        numeroReference: transaction.numeroReference || '',
        notesSupplementaires: transaction.notesSupplementaires || ''
      });
    } else {
      setFormData({
        type: 'traite', montant: '', dateEcheance: '', statut: 'à payer',
        dossierId: '', numeroReference: '', notesSupplementaires: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTransaction(null);
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      if (selectedTransaction) {
        await axios.put(`/api/transactions/${selectedTransaction._id}`, formData);
        setSnackbar({ open: true, message: "Transaction modifiée", severity: "success" });
      } else {
        await axios.post('/api/transactions', formData);
        setSnackbar({ open: true, message: "Transaction ajoutée", severity: "success" });
      }
      handleCloseDialog();
      fetchTransactions();
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur d'enregistrement", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cette transaction ?")) {
      try {
        await axios.delete(`/api/transactions/${id}`);
        setSnackbar({ open: true, message: "Transaction supprimée", severity: "success" });
        fetchTransactions();
      } catch (error) {
        console.error(error);
        setSnackbar({ open: true, message: "Erreur suppression", severity: "error" });
      }
    }
  };

  const columns = [
    { field: 'type', headerName: 'Type', width: 120 },
    { field: 'montant', headerName: 'Montant', width: 120 },
    { field: 'dateEcheance', headerName: 'Date Échéance', width: 150, valueGetter: (params) => new Date(params.row.dateEcheance).toLocaleDateString() },
    { field: 'statut', headerName: 'Statut', width: 120 },
    { field: 'numeroReference', headerName: 'Référence', width: 150 },
    { field: 'dossier', headerName: 'Dossier', flex: 1, valueGetter: (params) => params.row.dossierId?.titre || '-' },
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
        <Typography variant="h4">Gestion des Transactions</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Ajouter
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>
      ) : (
        <DataGrid
          rows={transactions}
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
        <DialogTitle>{selectedTransaction ? "Modifier Transaction" : "Ajouter Transaction"}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Type" name="type" value={formData.type} onChange={handleChange} fullWidth />
          <TextField label="Montant" name="montant" type="number" value={formData.montant} onChange={handleChange} fullWidth />
          <TextField label="Date Échéance" name="dateEcheance" type="date" value={formData.dateEcheance} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Statut" name="statut" value={formData.statut} onChange={handleChange} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Dossier</InputLabel>
            <Select name="dossierId" value={formData.dossierId} onChange={handleChange} label="Dossier">
              {dossiers.map((d) => (
                <MenuItem key={d._id} value={d._id}>{d.titre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Référence" name="numeroReference" value={formData.numeroReference} onChange={handleChange} fullWidth />
          <TextField label="Notes" name="notesSupplementaires" value={formData.notesSupplementaires} onChange={handleChange} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">{selectedTransaction ? "Modifier" : "Ajouter"}</Button>
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
