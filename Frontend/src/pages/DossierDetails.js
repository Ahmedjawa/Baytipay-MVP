// DossierDetailsPage.js - Détail d'un Dossier + Transactions associées

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper, CircularProgress, Divider, Button
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

export default function DossierDetailsPage() {
  const { id } = useParams();
  const [dossier, setDossier] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDossierDetails = async () => {
    try {
      setLoading(true);
      const dossierRes = await axios.get(`/api/dossiers/${id}`);
      const transactionsRes = await axios.get(`/api/transactions?dossierId=${id}`);
      setDossier(dossierRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossierDetails();
  }, [id]);

  const columns = [
    { field: 'type', headerName: 'Type', width: 120 },
    { field: 'montant', headerName: 'Montant', width: 120 },
    { field: 'dateEcheance', headerName: 'Date Échéance', width: 150, valueGetter: (params) => new Date(params.row.dateEcheance).toLocaleDateString() },
    { field: 'statut', headerName: 'Statut', width: 120 },
    { field: 'numeroReference', headerName: 'Référence', width: 150 },
    { field: 'notesSupplementaires', headerName: 'Notes', flex: 1 },
  ];

  return (
    <Box>
      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>
      ) : dossier ? (
        <>
          <Typography variant="h4" gutterBottom>{dossier.titre}</Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography><strong>Description :</strong> {dossier.description || '-'}</Typography>
                <Typography><strong>Montant Total :</strong> {dossier.montantTotal} TND</Typography>
                <Typography><strong>Statut :</strong> {dossier.statut}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography><strong>Partie :</strong> {dossier.partieId?.nom || '-'}</Typography>
                <Typography><strong>Date Création :</strong> {new Date(dossier.createdAt).toLocaleDateString()}</Typography>
              </Grid>
            </Grid>
          </Paper>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" gutterBottom>Transactions liées</Typography>

          <Box sx={{ my: 2 }}>
            <DataGrid
              rows={transactions}
              columns={columns}
              getRowId={(row) => row._id}
              autoHeight
              pageSize={10}
              rowsPerPageOptions={[5, 10, 20]}
            />
          </Box>
        </>
      ) : (
        <Typography variant="h6" color="error">Dossier introuvable.</Typography>
      )}
    </Box>
  );
}
