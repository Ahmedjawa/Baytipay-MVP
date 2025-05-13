import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Container,
  CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Tooltip, Chip
} from '@mui/material';
import { Visibility, Print, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import moment from 'moment';

function VentesList() {
  const navigate = useNavigate();
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVentes = async () => {
      try {
        const response = await apiClient.get('api/ventes');
        setVentes(response.data);
        console.log('Données reçues:', response.data); // Log de débogage
      } catch (error) {
        console.error('Erreur:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVentes();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAYE': return 'success';
      case 'EN_ATTENTE': return 'warning';
      case 'ANNULE': return 'error';
      default: return 'info';
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Liste des Ventes
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>N° Facture</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Total TTC</TableCell>
                  <TableCell>Mode Paiement</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ventes.map((vente) => (
                  <TableRow key={vente._id}>
                    <TableCell>{vente.numeroFacture}</TableCell>
                    <TableCell>
                      {vente.clientId?.nom ||  'Non renseigné'}
                    </TableCell>
                    <TableCell>
                      {moment(vente.dateVente).format('DD/MM/YYYY HH:mm')}
                    </TableCell>
                    <TableCell>
                      {(vente.transactionId?.montantTotalTTC || 0).toFixed(2)} €
                    </TableCell>
                    <TableCell>{vente.modePaiement}</TableCell>
                    <TableCell>
                      <Chip 
                        label={vente.statut} 
                        color={getStatusColor(vente.statut)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Détails">
                        <IconButton onClick={() => navigate(`/ventes/${vente._id}`)}>
                          <Visibility color="info" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Imprimer">
                        <IconButton>
                          <Print color="action" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton>
                          <Delete color="error" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {ventes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Aucune vente trouvée
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Container>
  );
}

export default VentesList;