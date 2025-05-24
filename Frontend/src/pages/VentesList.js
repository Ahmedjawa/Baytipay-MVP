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
  AttachMoney, Person, Business, Transform, Close
} from '@mui/icons-material';
import apiClient from '../utils/apiClient';
import moment from 'moment';
import { subDays, startOfYear, endOfYear } from 'date-fns';
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

  // Modification de la fonction handleTransformGroup pour rediriger vers la page de création de BL ou facture
  const handleTransformGroup = async (targetType) => {
    if (selectedVentes.length === 0) {
      showNotification('Veuillez sélectionner au moins un document', 'warning');
      return;
    }
    
    // Vérifier que tous les documents sélectionnés sont du même type
    const sourceTypes = Array.from(new Set(selectedVentes.map(v => v.typeDocument)));
    if (sourceTypes.length > 1) {
      showNotification('Veuillez sélectionner des documents du même type', 'warning');
      return;
    }
    
    const sourceType = sourceTypes[0];
    
    // Vérifier la validité de la transformation
    if (sourceType === 'FACTURE_PROFORMA' && targetType === 'BON_LIVRAISON') {
      // Devis vers Bon de Livraison
      const sourceIds = selectedVentes.map(v => v._id).join(',');
      navigate(`/vente?type=BON_LIVRAISON&sourceIds=${sourceIds}&sourceType=${sourceType}`);
    } 
    else if (sourceType === 'BON_LIVRAISON' && targetType === 'FACTURE_TTC') {
      // Bon de Livraison vers Facture
      const sourceIds = selectedVentes.map(v => v._id).join(',');
      navigate(`/vente?type=FACTURE_TTC&sourceIds=${sourceIds}&sourceType=${sourceType}`);
    }
    else {
      showNotification('Transformation non supportée', 'error');
    }
    
    handleCloseGroupActionMenu();
  };

  // Modification du rendu des actions de groupe pour correspondre aux nouvelles fonctionnalités
  const renderGroupActions = () => {
    // On ne rend plus d'élément flottant, puisque les boutons sont maintenant dans la barre d'outils
    return null;
  };

  // Fonction pour formater les montants
  const formatMontant = (montant) => {
    const value = parseFloat(montant) || 0;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'TND',
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
  
  // Fonction pour rendre les actions de groupe au-dessus du tableau
  const renderTransformButtons = () => {
    if (selectedVentes.length === 0) return null;
    
    const sourceTypes = Array.from(new Set(selectedVentes.map(v => v.typeDocument)));
    const hasSingleSourceType = sourceTypes.length === 1;
    const sourceType = hasSingleSourceType ? sourceTypes[0] : null;
    
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {selectedVentes.length} document(s) sélectionné(s)
          </Typography>
          
          <Button 
            variant="outlined" 
            color="error" 
            size="small"
            onClick={() => setSelectedVentes([])}
            startIcon={<Close />}
          >
            Annuler
          </Button>
          
          {hasSingleSourceType && (
            <>
              {sourceType === 'FACTURE_PROFORMA' && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<LocalShipping />}
                  onClick={() => handleTransformGroup('BON_LIVRAISON')}
                >
                  Transformer en BL
                </Button>
              )}
              
              {sourceType === 'BON_LIVRAISON' && (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<ReceiptLong />}
                  onClick={() => handleTransformGroup('FACTURE_TTC')}
                >
                  Transformer en Facture
                </Button>
              )}
              
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={<Print />}
                onClick={null /* Implémentation future */}
              >
                Imprimer
              </Button>
            </>
          )}
        </Box>
      </Paper>
    );
  };

  // Modifier le rendu du tableau pour mieux gérer les données manquantes
  const renderTable = () => (
    <TableContainer component={Paper} elevation={2}>
      <Table sx={{ minWidth: 750 }}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                color="primary"
                indeterminate={selectedVentes.length > 0 && selectedVentes.length < ventes.length}
                checked={ventes.length > 0 && selectedVentes.length === ventes.length}
                onChange={(event) => {
                  if (event.target.checked) {
                    // Si les documents sont de types différents, ne pas tout sélectionner
                    const types = new Set(ventes.map(v => v.typeDocument));
                    if (types.size > 1) {
                      showNotification('Les documents doivent être du même type pour être sélectionnés ensemble', 'warning');
                      return;
                    }
                    // Sinon, tout sélectionner
                    setSelectedVentes(ventes);
                  } else {
                    setSelectedVentes([]);
                  }
                }}
              />
            </TableCell>
            <TableCell>Document</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Date</TableCell>
            <TableCell align="right">Montant</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(ventes.length === 0) ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography variant="body1" sx={{ my: 2 }}>
                  Aucun document trouvé pour cette période.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            ventes
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((vente) => {
                const isItemSelected = isVenteSelected(vente);
                const isAvailable = vente.statut !== 'ANNULE';
                const docType = getDocumentTypeLabel(vente.typeDocument || 'FACTURE_TTC');
                
                return (
                  <TableRow
                    hover
                    key={vente._id}
                    selected={isItemSelected}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                      opacity: isAvailable ? 1 : 0.5
                    }}
                    onClick={(event) => handleRowClick(event, vente)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onChange={() => handleVenteSelect(vente)}
                        disabled={!isAvailable}
                      />
                    </TableCell>
                    
                    <TableCell component="th" scope="row">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getDocumentTypeIcon(vente.typeDocument)}
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {docType} #{vente.numeroDocument || vente.numeroFacture || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {vente.notes && vente.notes.length > 30 
                              ? vente.notes.substring(0, 30) + '...' 
                              : vente.notes || 'Aucune note'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      {renderClientName(vente.client)}
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {moment(vente.dateCreation || vente.date).format('DD/MM/YYYY')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {moment(vente.dateCreation || vente.date).format('HH:mm')}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {formatMontant(vente.montantTotalTTC)} TTC
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          HT: {formatMontant(vente.montantTotalHT)}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={vente.statut || 'TEMPORAIRE'} 
                        size="small"
                        sx={{ 
                          backgroundColor: getStatusColor(vente.statut),
                          color: 'white',
                          fontWeight: 'medium',
                          minWidth: 80
                        }}
                      />
                    </TableCell>
                    
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Tooltip title="Voir les détails">
                          <IconButton 
                            size="small"
                            onClick={() => navigate(`/ventes/${vente._id}`)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Plus d'options">
                          <IconButton 
                            size="small"
                            onClick={(event) => handleOpenActionMenu(event, vente)}
                          >
                            <MoreVert fontSize="small" />
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
        labelRowsPerPage="Lignes par page:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
      />
    </TableContainer>
  );

  const handleRowClick = (event, row) => {
    navigate(`/ventes/${row._id}`);
  };

  // Fonction pour rendre la barre d'outils avec les filtres et les boutons d'action
  const renderToolbar = () => {
    return (
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5">Historique des ventes</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {periodes.map((periode) => (
                <Chip
                  key={periode.value}
                  label={periode.label}
                  variant={filters.selectedPeriod === periode.value ? 'filled' : 'outlined'}
                  color={filters.selectedPeriod === periode.value ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setFilters(prev => ({ ...prev, selectedPeriod: periode.value }))}
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <TextField
                placeholder="Rechercher..."
                size="small"
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 250 }}
              />
              
              <Button 
                variant="outlined" 
                startIcon={<FilterList />}
                onClick={handleOpenFilterMenu}
                size="small"
              >
                Filtres
              </Button>
              
              {/* Boutons de création - toujours affichés */}
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={handleNewVente}
                size="small"
              >
                Facture
              </Button>
              
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Add />}
                onClick={handleNewDevis}
                size="small"
              >
                Devis
              </Button>
              
              <Button
                variant="contained"
                color="info"
                startIcon={<Add />}
                onClick={handleNewBonLivraison}
                size="small"
              >
                BL
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        {/* Menu de filtres avancés */}
        <Menu
          anchorEl={filterMenuAnchor}
          open={Boolean(filterMenuAnchor)}
          onClose={handleCloseFilterMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Box sx={{ p: 2, width: 300 }}>
            <Typography variant="subtitle1" gutterBottom>Filtres avancés</Typography>
            
            <TextField
              label="Date début"
              type="date"
              fullWidth
              margin="dense"
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
            />
            
            <TextField
              label="Date fin"
              type="date"
              fullWidth
              margin="dense"
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
            />
            
            <FormControl fullWidth margin="dense">
              <Typography variant="caption">Type de document</Typography>
              <Select
                displayEmpty
                size="small"
                value={filters.typeDocument}
                onChange={(e) => setFilters(prev => ({ ...prev, typeDocument: e.target.value }))}
              >
                {documentTypes.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {option.icon && option.icon}
                      {option.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="dense">
              <Typography variant="caption">Statut</Typography>
              <Select
                displayEmpty
                size="small"
                value={filters.statut}
                onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
              >
                {statusOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined" 
                color="inherit" 
                size="small"
                onClick={handleResetFilters}
              >
                Réinitialiser
              </Button>
              
              <Button 
                variant="contained" 
                color="primary" 
                size="small"
                onClick={handleCloseFilterMenu}
              >
                Appliquer
              </Button>
            </Box>
          </Box>
        </Menu>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {renderToolbar()}
      
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Container maxWidth="xl">
          {renderStats()}
          {renderTransformButtons()}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderTable()
          )}
        </Container>
      </Box>
      
      {renderGroupActions()}
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
      >
        <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
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