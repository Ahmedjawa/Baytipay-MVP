import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Container,
  CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Tooltip, Chip, Button, Grid, TextField, Stack,
  Menu, MenuItem, Divider, InputAdornment, FormControl,
  Select, Avatar, Card, CardContent, Checkbox,
  Badge, Alert, Snackbar, TablePagination, Toolbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  Visibility, Print, Delete, Add, CheckCircle, Edit, 
  ArrowForward, MoreVert, Search, FilterList, 
  ReceiptLong, Description, LocalShipping, AssignmentReturn,
  AttachMoney, Person, Business, Transform
} from '@mui/icons-material';
import apiClient from '../utils/apiClient';
import moment from 'moment';
import { subDays, startOfYear, endOfYear } from 'date-fns';
import TransformDevisDialog from '../components/vente/TransformDevisDialog';
import { alpha } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';

function VentesList() {
  const navigate = useNavigate();
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: [new Date(), new Date()],
    selectedPeriod: '7j',
    statut: '',
    typeDocument: '',
    searchQuery: ''
  });
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedVente, setSelectedVente] = useState(null);
  const [statsData, setStatsData] = useState({
    totalPeriod: 0,
    totalHT: 0,
    totalTVA: 0,
    countByType: {
      'FACTURE_TTC': 0,
      'FACTURE_PROFORMA': 0,
      'BON_LIVRAISON': 0,
      'AVOIR': 0
    },
    countByStatus: {
      'PAYE': 0,
      'EN_ATTENTE': 0,
      'ANNULE': 0,
      'TEMPORAIRE': 0,
      'VALIDEE': 0
    }
  });
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [selectedVentes, setSelectedVentes] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [groupActionMenuAnchor, setGroupActionMenuAnchor] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [transformDialogOpen, setTransformDialogOpen] = useState(false);

  const periodes = [
    { label: '7 derniers jours', value: '7j' },
    { label: '30 derniers jours', value: '30j' },
    { label: 'Année en cours', value: 'annee' },
    { label: 'Personnalisé', value: 'custom' }
  ];

  const statusOptions = [
    { label: 'Tous les statuts', value: '' },
    { label: 'Payé', value: 'PAYE' },
    { label: 'En attente', value: 'EN_ATTENTE' },
    { label: 'Annulé', value: 'ANNULE' },
    { label: 'Temporaire', value: 'TEMPORAIRE' },
    { label: 'Validée', value: 'VALIDEE' }
  ];

  const documentTypes = [
    { label: 'Tous les types', value: '' },
    { label: 'Facture', value: 'FACTURE_TTC', icon: <ReceiptLong /> },
    { label: 'Devis', value: 'FACTURE_PROFORMA', icon: <Description /> },
    { label: 'Bon de livraison', value: 'BON_LIVRAISON', icon: <LocalShipping /> },
    { label: 'Avoir', value: 'AVOIR', icon: <AssignmentReturn /> }
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
    const fetchVentes = async () => {
      try {
        setLoading(true);
        const params = {
          dateDebut: moment(filters.dateRange[0]).startOf('day').format(),
          dateFin: moment(filters.dateRange[1]).endOf('day').format(),
          statut: filters.statut,
          typeDocument: filters.typeDocument,
          q: filters.searchQuery,
          populate: 'transaction,client'
        };
        
        const response = await apiClient.get('api/ventes', { params });
        console.log('Données reçues:', response.data);

        // Vérifier si les données sont bien structurées
        const ventesData = Array.isArray(response.data) ? response.data : [];
        
        // Transformer les données pour inclure les montants de la transaction
        const ventesWithMontants = ventesData.map(vente => ({
          ...vente,
          montantTotalHT: vente.transaction?.montantTotalHT || 0,
          montantTotalTTC: vente.transaction?.montantTotalTTC || 0,
          montantTaxes: vente.transaction?.montantTaxes || 0,
          numeroFacture: vente.numeroDocument || vente.transaction?.numeroTransaction || 'N/A'
        }));

        setVentes(ventesWithMontants);
        
        // Calculer les statistiques détaillées
        const stats = ventesWithMontants.reduce((acc, vente) => {
          // Totaux
          const montantTTC = parseFloat(vente.montantTotalTTC) || 0;
          const montantHT = parseFloat(vente.montantTotalHT) || 0;
          const montantTVA = montantTTC - montantHT;

          acc.totalPeriod += montantTTC;
          acc.totalHT += montantHT;
          acc.totalTVA += montantTVA;
          
          // Comptage par type
          const type = vente.typeDocument || 'FACTURE_TTC';
          acc.countByType[type] = (acc.countByType[type] || 0) + 1;
          
          // Comptage par statut
          const statut = vente.statut || 'TEMPORAIRE';
          acc.countByStatus[statut] = (acc.countByStatus[statut] || 0) + 1;
          
          return acc;
        }, {
          totalPeriod: 0,
          totalHT: 0,
          totalTVA: 0,
          countByType: {},
          countByStatus: {}
        });
        
        console.log('Statistiques calculées:', stats);
        setStatsData(stats);
      } catch (error) {
        console.error('Erreur lors de la récupération des ventes:', error);
        showNotification('Erreur lors du chargement des données', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchVentes();
  }, [filters]);

  const handleNewVente = () => navigate('/vente?type=FACTURE_TTC');

  const handleNewDevis = () => navigate('/vente?type=FACTURE_PROFORMA');
  
  const handleNewBonLivraison = () => navigate('/vente?type=BON_LIVRAISON');
  
  // Gestion du menu contextuel d'actions
  const handleOpenActionMenu = (event, vente) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedVente(vente);
  };
  
  const handleCloseActionMenu = () => {
    setActionMenuAnchor(null);
    setSelectedVente(null);
  };
  
  // Convertir un document en un autre type selon la logique métier
  const handleConvertDocument = (sourceType, targetType) => {
    if (!selectedVente) return;
    
    // Construire l'URL avec les paramètres appropriés
    const url = `/vente?sourceId=${selectedVente._id}&sourceType=${sourceType}&targetType=${targetType}`;
    
    // Fermer le menu et naviguer
    handleCloseActionMenu();
    navigate(url);
  };

  const handleConvertToVente = async (venteId) => {
    try {
      await apiClient.patch(`api/ventes/${venteId}`, { statut: 'VALIDEE' });
      setFilters(prev => ({ ...prev })); // Forcer un refresh
    } catch (error) {
      console.error('Erreur de conversion:', error);
    }
  };

  const handleOpenFilterMenu = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleCloseFilterMenu = () => {
    setFilterMenuAnchor(null);
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: [subDays(new Date(), 6), new Date()],
      selectedPeriod: '7j',
      statut: '',
      typeDocument: '',
      searchQuery: ''
    });
    handleCloseFilterMenu();
  };

  const getDocumentTypeIcon = (type) => {
    switch (type) {
      case 'FACTURE_TTC':
        return <ReceiptLong fontSize="small" />;
      case 'FACTURE_PROFORMA':
        return <Description fontSize="small" />;
      case 'BON_LIVRAISON':
        return <LocalShipping fontSize="small" />;
      case 'AVOIR':
        return <AssignmentReturn fontSize="small" />;
      default:
        return <ReceiptLong fontSize="small" />;
    }
  };

  const getDocumentTypeLabel = (type) => {
    switch (type) {
      case 'FACTURE_TTC':
        return 'Facture';
      case 'FACTURE_PROFORMA':
        return 'Devis';
      case 'BON_LIVRAISON':
        return 'Bon de livraison';
      case 'AVOIR':
        return 'Avoir';
      default:
        return 'Facture';
    }
  };

  // Fonction pour afficher une notification
  const showNotification = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Fonction pour gérer la sélection d'une vente avec feedback visuel
  const handleVenteSelect = (vente) => {
    if (!vente.clientId) {
      showNotification('Ce document n\'a pas de client associé', 'error');
      return;
    }

    setSelectedVentes(prevSelected => {
      // Si la vente est déjà sélectionnée, la retirer
      if (prevSelected.find(v => v._id === vente._id)) {
        const newSelected = prevSelected.filter(v => v._id !== vente._id);
        if (newSelected.length === 0) {
          setSelectedClientId(null);
          showNotification('Sélection annulée');
        }
        return newSelected;
      }

      // Si c'est la première sélection ou si le client est le même
      if (selectedClientId === null || selectedClientId === vente.clientId) {
        setSelectedClientId(vente.clientId);
        const newSelected = [...prevSelected, vente];
        showNotification(`${newSelected.length} document(s) sélectionné(s)`);
        return newSelected;
      } else {
        showNotification('Vous ne pouvez sélectionner que des documents du même client', 'error');
        return prevSelected;
      }
    });
  };

  // Fonction pour vérifier si une vente est sélectionnée
  const isVenteSelected = (vente) => {
    return selectedVentes.some(v => v._id === vente._id);
  };

  // Fonction pour ouvrir le menu d'actions groupées
  const handleOpenGroupActionMenu = (event) => {
    setGroupActionMenuAnchor(event.currentTarget);
  };

  // Fonction pour fermer le menu d'actions groupées
  const handleCloseGroupActionMenu = () => {
    setGroupActionMenuAnchor(null);
  };

  // Fonction pour gérer la transformation groupée avec confirmation
  const handleTransformGroup = async (targetType) => {
    if (selectedVentes.length === 0) return;

    if (targetType === 'BON_LIVRAISON') {
      // Au lieu de transformer directement, ouvrir le dialogue
      setTransformDialogOpen(true);
    } else if (targetType === 'FACTURE_TTC') {
      const confirmMessage = `Transformer ${selectedVentes.length} bons de livraison en factures ?`;

      if (!window.confirm(confirmMessage)) return;

      try {
        const venteIds = selectedVentes.map(v => v._id);
        const response = await apiClient.post('/api/ventes/transformer-bl-en-factures', { 
          blIds: venteIds,
          modePaiement: 'ESPECES'
        });
        
        if (response.data.success) {
          showNotification(`${selectedVentes.length} facture(s) créée(s) avec succès`);
          setSelectedVentes([]);
          setSelectedClientId(null);
          setFilters(prev => ({ ...prev })); // Rafraîchir la liste
        }
      } catch (error) {
        console.error('Erreur lors de la transformation groupée:', error);
        showNotification(error.response?.data?.error || 'Erreur lors de la transformation', 'error');
      }
    }
  };

  // Modifier le rendu des actions groupées
  const renderGroupActions = () => {
    if (selectedVentes.length === 0) return null;

    const allDevis = selectedVentes.every(v => v.typeDocument === 'FACTURE_PROFORMA');
    const allBL = selectedVentes.every(v => v.typeDocument === 'BON_LIVRAISON');
    const clientName = selectedVentes[0]?.client?.raisonSociale || 
      `${selectedVentes[0]?.client?.prenom || ''} ${selectedVentes[0]?.client?.nom || ''}`;

    return (
      <Box sx={{ mt: 2, mb: 2 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          {selectedVentes.length} document(s) sélectionné(s) pour le client : {clientName}
        </Alert>
        <Stack direction="row" spacing={2}>
          {allDevis && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LocalShipping />}
              onClick={() => handleTransformGroup('BON_LIVRAISON')}
            >
              Transformer en bons de livraison ({selectedVentes.length})
            </Button>
          )}
          {allBL && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ReceiptLong />}
              onClick={() => handleTransformGroup('FACTURE_TTC')}
            >
              Transformer en factures ({selectedVentes.length})
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setSelectedVentes([]);
              setSelectedClientId(null);
              showNotification('Sélection annulée');
            }}
          >
            Annuler la sélection
          </Button>
        </Stack>
      </Box>
    );
  };

  // Fonction pour formater les montants
  const formatMontant = (montant) => {
    const value = parseFloat(montant) || 0;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Fonction pour afficher le nom du client
  const renderClientName = (client) => {
    if (!client) return (
      <Chip 
        label="Client non renseigné" 
        color="error" 
        size="small" 
        icon={<Person />}
      />
    );

    const clientName = client.raisonSociale || 
      `${client.prenom || ''} ${client.nom || ''}`.trim() || 
      'Client sans nom';

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
          {client.raisonSociale ? <Business /> : <Person />}
        </Avatar>
        <Typography variant="body2" noWrap>
          {clientName}
        </Typography>
      </Box>
    );
  };

  // Rendu des statistiques amélioré
  const renderStats = () => (
    <Grid container spacing={2} sx={{ mt: 3, mb: 4 }}>
      {/* Total période */}
      <Grid item xs={12} md={3}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Total période
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              {formatMontant(statsData.totalPeriod)}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                HT: {formatMontant(statsData.totalHT)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                TVA: {formatMontant(statsData.totalTVA)}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Types de documents */}
      {documentTypes.filter(dt => dt.value).map(docType => (
        <Grid item xs={6} md={2} key={docType.value}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                  {docType.icon}
                </Avatar>
                <Typography variant="subtitle2" color="text.secondary">
                  {docType.label}
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {statsData.countByType[docType.value] || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Statuts */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Répartition par statut
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            {statusOptions.filter(s => s.value).map(status => (
              <Chip
                key={status.value}
                label={`${status.label}: ${statsData.countByStatus[status.value] || 0}`}
                color={getStatusColor(status.value)}
                variant="outlined"
              />
            ))}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );

  // Modifier le rendu du tableau pour mieux gérer les données manquantes
  const renderTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedVentes.length > 0 && selectedVentes.length < ventes.length}
                checked={selectedVentes.length > 0 && selectedVentes.length === ventes.length}
                onChange={(event) => {
                  if (event.target.checked) {
                    const firstClientId = ventes[0]?.clientId;
                    if (firstClientId) {
                      const sameClientVentes = ventes.filter(v => v.clientId === firstClientId);
                      setSelectedVentes(sameClientVentes);
                      setSelectedClientId(firstClientId);
                      showNotification(`${sameClientVentes.length} document(s) sélectionné(s)`);
                    }
                  } else {
                    setSelectedVentes([]);
                    setSelectedClientId(null);
                    showNotification('Sélection annulée');
                  }
                }}
              />
            </TableCell>
            <TableCell>Type</TableCell>
            <TableCell>N° Document</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Date</TableCell>
            <TableCell align="right">Montant HT</TableCell>
            <TableCell align="right">TVA</TableCell>
            <TableCell align="right">Total TTC</TableCell>
            <TableCell>Mode Paiement</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : ventes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Aucune vente trouvée pour cette période
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            ventes
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((vente) => {
                const montantTTC = parseFloat(vente.montantTotalTTC) || 0;
                const montantHT = parseFloat(vente.montantTotalHT) || 0;
                const montantTVA = montantTTC - montantHT;

                return (
                  <TableRow 
                    key={vente._id}
                    sx={{
                      bgcolor: isVenteSelected(vente) ? 'action.selected' : 'inherit',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isVenteSelected(vente)}
                        onChange={() => handleVenteSelect(vente)}
                        disabled={selectedClientId !== null && selectedClientId !== vente.clientId}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={getDocumentTypeLabel(vente.typeDocument)}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getDocumentTypeIcon(vente.typeDocument)}
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {getDocumentTypeLabel(vente.typeDocument)}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'medium' }}>
                      {vente.numeroFacture || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        color="primary"
                        variant="dot"
                        invisible={!isVenteSelected(vente)}
                      >
                        {renderClientName(vente.client)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vente.dateVente ? moment(vente.dateVente).format('DD/MM/YYYY HH:mm') : 'N/A'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                      {formatMontant(montantHT)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMontant(montantTVA)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                      {formatMontant(montantTTC)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={vente.modePaiement || 'Non spécifié'}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={vente.statut || 'TEMPORAIRE'}
                        color={getStatusColor(vente.statut)}
                        size="small"
                        sx={{ fontWeight: 'medium' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Tooltip title="Détails">
                          <IconButton onClick={() => navigate(`/ventes/${vente._id}`)}>
                            <Visibility color="info" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Imprimer">
                          <IconButton onClick={() => {
                            const docType = vente.typeDocument || 'FACTURE_TTC';
                            window.open(`/api/documents/print/${vente._id}?type=${docType}`, '_blank');
                          }}>
                            <Print />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Actions">
                          <IconButton onClick={(e) => handleOpenActionMenu(e, vente)}>
                            <MoreVert />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={ventes.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Lignes par page"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
      />
    </TableContainer>
  );

  const handleTransformDevis = () => {
    console.log('handleTransformDevis called');
    console.log('Selected ventes:', selectedVentes);
    
    const selectedDevis = selectedVentes.filter(vente => vente.typeDocument === 'FACTURE_PROFORMA');
    console.log('Selected devis:', selectedDevis);
    
    if (selectedDevis.length === 0) {
      console.log('No devis selected');
      setSnackbar({
        open: true,
        message: 'Veuillez sélectionner au moins un devis à transformer',
        severity: 'warning'
      });
      return;
    }

    const hasTransformedDevis = selectedDevis.some(devis => devis.statut === 'TRANSFORME');
    console.log('Has transformed devis:', hasTransformedDevis);
    
    if (hasTransformedDevis) {
      console.log('Some devis are already transformed');
      setSnackbar({
        open: true,
        message: 'Un ou plusieurs devis sélectionnés ont déjà été transformés',
        severity: 'error'
      });
      return;
    }

    console.log('Opening transform dialog');
    setTransformDialogOpen(true);
  };

  const handleCloseTransformDialog = () => {
    setTransformDialogOpen(false);
  };

  const renderToolbar = () => {
    const hasSelectedDevis = selectedVentes.some(vente => 
      vente.typeDocument === 'FACTURE_PROFORMA' && vente.statut !== 'TRANSFORME'
    );
    console.log('Has selected devis for toolbar:', hasSelectedDevis);
    console.log('Selected ventes for toolbar:', selectedVentes);

    return (
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          ...(selectedVentes.length > 0 && {
            bgcolor: (theme) =>
              alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
          }),
        }}
      >
        {selectedVentes.length > 0 ? (
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {selectedVentes.length} élément(s) sélectionné(s)
          </Typography>
        ) : (
          <Typography
            sx={{ flex: '1 1 100%' }}
            variant="h6"
            id="tableTitle"
            component="div"
          >
            Ventes
          </Typography>
        )}

        {selectedVentes.length > 0 ? (
          <>
            {hasSelectedDevis && (
              <Tooltip title="Transformer en bon de livraison">
                <IconButton onClick={handleTransformDevis}>
                  <Transform />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Supprimer">
              <IconButton onClick={handleDelete}>
                <Delete />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Filtrer">
              <IconButton onClick={handleFilterClick}>
                <FilterList />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rechercher">
              <IconButton onClick={handleSearchClick}>
                <Search />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleCreateNew}
              sx={{ ml: 2 }}
            >
              Nouveau
            </Button>
          </>
        )}
      </Toolbar>
    );
  };

  const handleRowClick = (event, row) => {
    navigate(`/ventes/${row._id}`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Grid container spacing={3} justifyContent="space-between">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" gutterBottom>Historique des ventes</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2 }}>
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
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: { xs: 'stretch', md: 'flex-end' } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Add />}
                  onClick={handleNewVente}
                  fullWidth
                >
                  Nouvelle Facture
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<Add />}
                  onClick={handleNewDevis}
                  fullWidth
                >
                  Nouveau Devis
                </Button>
                <Button
                  variant="contained"
                  color="info"
                  startIcon={<Add />}
                  onClick={handleNewBonLivraison}
                  fullWidth
                >
                  Bon de Livraison
                </Button>
              </Stack>
            </Box>
          </Grid>
        </Grid>

        {renderStats()}

        {/* Filtres et recherche */}
        <Paper sx={{ p: 2, mb: 3 }} elevation={2}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Début"
                  type="date"
                  size="small"
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
                  size="small"
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
            </Grid>
            
            <Grid item xs={12} md={7}>
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Recherche"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="N° facture, client, montant..."
                />
                
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    displayEmpty
                    value={filters.typeDocument}
                    onChange={(e) => setFilters(prev => ({ ...prev, typeDocument: e.target.value }))}
                    renderValue={(selected) => {
                      if (!selected) return "Type de document";
                      const type = documentTypes.find(t => t.value === selected);
                      return type ? type.label : selected;
                    }}
                  >
                    {documentTypes.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {option.icon && <Box sx={{ color: 'primary.main' }}>{option.icon}</Box>}
                          {option.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    displayEmpty
                    value={filters.statut}
                    onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
                    renderValue={(selected) => !selected ? "Statut" : statusOptions.find(s => s.value === selected)?.label || selected}
                  >
                    {statusOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Button 
                  variant="outlined" 
                  color="inherit" 
                  onClick={handleResetFilters}
                  size="small"
                >
                  Réinitialiser
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {renderGroupActions()}
        {renderTable()}
      </Box>
      
      {/* Menu contextuel pour la conversion de documents */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleCloseActionMenu}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
          Actions
        </Typography>
        <Divider />
        
        {/* Options d'impression */}
        <MenuItem onClick={() => {
          handleCloseActionMenu();
          // Logique d'impression du document actuel
          const docType = selectedVente.typeDocument || 'FACTURE_TTC';
          window.open(`/api/documents/print/${selectedVente._id}?type=${docType}`, '_blank');
        }}>
          <Print fontSize="small" sx={{ mr: 1 }} />
          Imprimer ce document
        </MenuItem>
        
        <MenuItem onClick={() => navigate(`/vente?sourceId=${selectedVente?._id}&sourceType=${selectedVente?.typeDocument || 'FACTURE_TTC'}`)}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Modifier ce document
        </MenuItem>
        
        <Divider />
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
          Convertir en
        </Typography>
        <Divider />
        
        {/* BL → Facture */}
        {selectedVente?.typeDocument === 'BON_LIVRAISON' && (
          <MenuItem onClick={() => handleConvertDocument('BON_LIVRAISON', 'FACTURE_TTC')}>
            <ArrowForward fontSize="small" sx={{ mr: 1 }} />
            Créer une facture
          </MenuItem>
        )}
        
        {/* Devis → BL */}
        {selectedVente?.typeDocument === 'FACTURE_PROFORMA' && (
          <MenuItem onClick={() => {
            handleCloseActionMenu();
            setSelectedVentes([selectedVente]);
            setTransformDialogOpen(true);
          }}>
            <ArrowForward fontSize="small" sx={{ mr: 1 }} />
            Créer un bon de livraison
          </MenuItem>
        )}
        
        {/* Devis → Facture */}
        {selectedVente?.typeDocument === 'FACTURE_PROFORMA' && (
          <MenuItem onClick={() => handleConvertDocument('FACTURE_PROFORMA', 'FACTURE_TTC')}>
            <ArrowForward fontSize="small" sx={{ mr: 1 }} />
            Créer une facture
          </MenuItem>
        )}
        
        {/* Facture → Avoir */}
        {selectedVente?.typeDocument === 'FACTURE_TTC' && (
          <MenuItem onClick={() => handleConvertDocument('FACTURE_TTC', 'AVOIR')}>
            <ArrowForward fontSize="small" sx={{ mr: 1 }} />
            Créer un avoir
          </MenuItem>
        )}
        
        {/* Facture partielle → Paiement complémentaire */}
        {selectedVente?.typeDocument === 'FACTURE_TTC' && selectedVente?.montantRegle < selectedVente?.montantTotalTTC && (
          <MenuItem onClick={() => handleConvertDocument('FACTURE_PARTIELLE', 'FACTURE_TTC')}>
            <ArrowForward fontSize="small" sx={{ mr: 1 }} />
            Compléter le paiement
          </MenuItem>
        )}
        
        <Divider />
        <MenuItem onClick={() => {
          handleCloseActionMenu();
          // Logique de suppression à implémenter
          if (window.confirm(`Êtes-vous sûr de vouloir supprimer ce document ${selectedVente?.numeroFacture}?`)) {
            // Appel API de suppression à implémenter
            apiClient.delete(`api/ventes/${selectedVente?._id}`)
              .then(() => {
                setFilters(prev => ({ ...prev })); // Forcer un refresh
              })
              .catch(error => {
                console.error('Erreur lors de la suppression:', error);
                alert('Erreur lors de la suppression du document');
              });
          }
        }}>
          <Delete fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
          <Typography color="error.main">Supprimer</Typography>
        </MenuItem>
      </Menu>
      
      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <TransformDevisDialog
        open={transformDialogOpen}
        onClose={handleCloseTransformDialog}
        selectedDevisIds={selectedVentes.map(vente => vente._id)}
      />
    </Container>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'PAYE':
      return 'success';
    case 'EN_ATTENTE':
      return 'warning';
    case 'ANNULE':
      return 'error';
    case 'TEMPORAIRE':
      return 'info';
    case 'VALIDEE':
      return 'primary';
    default:
      return 'default';
  }
};

export default VentesList;