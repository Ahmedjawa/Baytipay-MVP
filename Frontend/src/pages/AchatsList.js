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

function AchatsList() {
  const navigate = useNavigate();
  const [achats, setachats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchachats = async () => {
      try {
        const response = await apiClient.get('api/achats');
        setachats(response.data);
        console.log('Données reçues:', response.data); // Log de débogage
      } catch (error) {
        console.error('Erreur:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchachats();
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
          Liste des achats
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
                {achats.map((achat) => (
                  <TableRow key={achat._id}>
                    <TableCell>{achat.numeroFacture}</TableCell>
                    <TableCell>
                      {achat.fournisseurId?.nom ||  'Non renseigné'}
                    </TableCell>
                    <TableCell>
                      {moment(achat.dateachat).format('DD/MM/YYYY HH:mm')}
                    </TableCell>
                    <TableCell>
                      {(achat.transactionId?.montantTotalTTC || 0).toFixed(2)} €
                    </TableCell>
                    <TableCell>{achat.modePaiement}</TableCell>
                    <TableCell>
                      <Chip 
                        label={achat.statut} 
                        color={getStatusColor(achat.statut)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Détails">
                        <IconButton onClick={() => navigate(`/achats/${achat._id}`)}>
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
                {achats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      Aucune achat trouvée
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

export default AchatsList;