import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Container,
  CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Tooltip, Chip, Button, Grid, TextField, Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Visibility, Print, Delete, Add } from '@mui/icons-material';
import apiClient from '../utils/apiClient';
import moment from 'moment';
import { subDays, startOfYear, endOfYear } from 'date-fns';

function AchatsList() {
  const navigate = useNavigate();
  const [achats, setAchats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: [new Date(), new Date()],
    selectedPeriod: '7j',
    statut: '',
    searchQuery: ''
  });

  const periodes = [
    { label: '7 derniers jours', value: '7j' },
    { label: '30 derniers jours', value: '30j' },
    { label: 'Année en cours', value: 'annee' },
    { label: 'Personnalisé', value: 'custom' }
  ];

  const statuts = [
    { label: 'Tous', value: '' },
    { label: 'Achats validés', value: 'VALIDEE' },
    { label: 'Payés', value: 'PAYE' },
    { label: 'En attente', value: 'EN_ATTENTE' }
  ];

  useEffect(() => {
    const updateDateRange = () => {
      let newDateRange;
      switch (filters.selectedPeriod) {
        case '7j':
          newDateRange = [subDays(new Date(), 6), new Date()];
          break;
        case '30j':
          newDateRange = [subDays(new Date(), 29), new Date()];
          break;
        case 'annee':
          newDateRange = [startOfYear(new Date()), endOfYear(new Date())];
          break;
        default:
          return;
      }
      setFilters(prev => ({ ...prev, dateRange: newDateRange }));
    };

    if (filters.selectedPeriod !== 'custom') {
      updateDateRange();
    }
  }, [filters.selectedPeriod]);

  useEffect(() => {
    const fetchAchats = async () => {
      try {
        setLoading(true);
        const params = {
          dateDebut: moment(filters.dateRange[0]).startOf('day').format(),
          dateFin: moment(filters.dateRange[1]).endOf('day').format(),
          statut: filters.statut,
          q: filters.searchQuery
        };
        
        console.log('Paramètres de filtrage:', params); // Pour déboguer
        const response = await apiClient.get('api/achats', { params });
        setAchats(response.data);
      } catch (error) {
        console.error('Erreur:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAchats();
  }, [filters]);

  const handleNewAchat = () => navigate('/achat');

  const getTotalPeriod = () => {
    return achats.reduce((acc, achat) => {
      const montant = achat.transactionId?.montantTotalTTC || 0;
      return acc + montant;
    }, 0).toFixed(2);
  };

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
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography variant="h4">Historique des achats</Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
              Total période : {getTotalPeriod()} €
            </Typography>
          </Grid>

          <Grid item xs={12} md={8}>
            <Stack direction="column" spacing={2}>
              <Stack direction="row" spacing={1}>
                {periodes.map((periode) => (
                  <Button
                    key={periode.value}
                    variant={filters.selectedPeriod === periode.value ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setFilters(prev => ({ ...prev, selectedPeriod: periode.value }))}
                  >
                    {periode.label}
                  </Button>
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {statuts.map((statut) => (
                  <Button
                    key={statut.value}
                    variant={filters.statut === statut.value ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setFilters(prev => ({ ...prev, statut: statut.value }))}
                  >
                    {statut.label}
                  </Button>
                ))}
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Début"
                  type="date"
                  value={moment(filters.dateRange[0]).format('YYYY-MM-DD')}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setFilters(prev => ({
                      ...prev,
                      dateRange: [newDate, prev.dateRange[1]],
                      selectedPeriod: 'custom'
                    }))
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Fin"
                  type="date"
                  value={moment(filters.dateRange[1]).format('YYYY-MM-DD')}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setFilters(prev => ({
                      ...prev,
                      dateRange: [prev.dateRange[0], newDate],
                      selectedPeriod: 'custom'
                    }))
                  }}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  label="Recherche"
                  variant="outlined"
                  size="small"
                  fullWidth
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={handleNewAchat}
                  sx={{ minWidth: 160 }}
                >
                  Nouvel Achat
                </Button>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          {loading ? (
            <CircularProgress />
          ) : (
            <TableContainer component={Paper} elevation={3}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>N° Facture</TableCell>
                    <TableCell>Fournisseur</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Total TTC</TableCell>
                    <TableCell>Mode Paiement</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {achats.map((achat) => (
                    <TableRow key={achat._id} hover>
                      <TableCell>{achat.numeroFacture}</TableCell>
                      <TableCell>
                        {achat.fournisseurId?.raisonSociale || 
                         achat.fournisseurId?.nom || 'Non renseigné'}
                      </TableCell>
                      <TableCell>
                        {moment(achat.dateAchat).format('DD/MM/YYYY HH:mm')}
                      </TableCell>
                      <TableCell align="right">
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
                        Aucun achat trouvé pour cette période
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default AchatsList;