// Tiers.js - Page unifiée de gestion des tiers (clients, fournisseurs et autres)
import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Typography, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, CircularProgress, Tabs, Tab, Alert, InputAdornment,
  Chip, Paper, Avatar, Grid, Divider, FormControl, InputLabel, Select, MenuItem, 
  FormControlLabel, Switch, Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  Add, Edit, Delete, Search, FilterList, ImportExport, CheckCircle, 
  Cancel, Pending, Visibility, Receipt, Payment, Person, Store, Business
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { useDebouncedCallback } from 'use-debounce';
import axios from 'axios';
import config from '../config';
import apiClient from '../utils/apiClient';

// Fonction pour obtenir l'icône du type de tiers
const getTiersTypeIcon = (type) => {
  switch (type) {
    case 'CLIENT': return <Person />;
    case 'FOURNISSEUR': return <Store />;
    case 'AUTRE': return <Business />;
    default: return <Person />;
  }
};

// Fonction pour obtenir la couleur et l'icône du statut
const getStatusChip = (actif, soldeCourant) => {
  if (!actif) {
    return { color: 'default', label: 'Inactif', icon: <Cancel fontSize="small" /> };
  }
  if (soldeCourant < 0) {
    return { color: 'error', label: 'Paiement en retard', icon: <Pending fontSize="small" /> };
  }
  return { color: 'success', label: 'Actif', icon: <CheckCircle fontSize="small" /> };
};

export default function TiersPage() {
  const navigate = useNavigate();
  // États principaux
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedTiers, setSelectedTiers] = useState(null);
  const [formData, setFormData] = useState({
    type: 'CLIENT',
    nom: '',
    adresse: '',
    telephone: '',
    email: '',
    siteWeb: '',
    matriculeFiscal: '',
    actif: true
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('TOUS');
  const [sortBy, setSortBy] = useState('nom');
  const [detailsTab, setDetailsTab] = useState(0);
  const [formErrors, setFormErrors] = useState({});
  const [similarTiers, setSimilarTiers] = useState([]);
  const [tiersTransactions, setTiersTransactions] = useState([]);
  const [tiersPaiements, setTiersPaiements] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingPaiements, setLoadingPaiements] = useState(false);

  // Définition des colonnes pour les tableaux
  const transactionsColumns = [
    { field: 'numeroTransaction', headerName: 'N° Transaction', flex: 1 },
    { field: 'dateTransaction', headerName: 'Date', width: 120 },
    { field: 'montantTotalTTC', headerName: 'Montant', width: 120, type: 'number' },
    { 
      field: 'statut', 
      headerName: 'Statut', 
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'VALIDEE' ? 'success' : 
            params.value === 'ANNULEE' ? 'error' : 'warning'
          }
          size="small"
        />
      )
    }
  ];

  const paiementsColumns = [
    { field: 'reference', headerName: 'Référence', flex: 1 },
    { field: 'datePaiement', headerName: 'Date', width: 120 },
    { field: 'montant', headerName: 'Montant', width: 120, type: 'number' },
    { 
      field: 'statut', 
      headerName: 'Statut', 
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'ENCAISSE' ? 'success' : 
            params.value === 'REJETE' ? 'error' : 'warning'
          }
          size="small"
        />
      )
    },
    { field: 'type', headerName: 'Type', width: 120 }
  ];

  // Fonction de recherche des doublons
  const checkForDuplicates = useDebouncedCallback(async (value) => {
    try {
      const res = await apiClient.get(`${config.backendURL}/tiers/search?q=${value}`);
      setSimilarTiers(res.data);
    } catch (error) {
      console.error('Erreur recherche doublons:', error);
    }
  }, 500);

  // Fonction pour charger tous les tiers
  const fetchTiers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`${config.backendURL}/tiers`);
      setTiers(res.data);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur de chargement des tiers", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  // Gestion de la boîte de dialogue de création/modification
  const handleOpenDialog = (tiers = null) => {
    setSelectedTiers(tiers);
    if (tiers) {
      setFormData({
        type: tiers.type || 'CLIENT',
        nom: tiers.nom || '',
        adresse: tiers.adresse || '',
        telephone: tiers.telephone || '',
        email: tiers.email || '',
        siteWeb: tiers.siteWeb || '',
        matriculeFiscal: tiers.matriculeFiscal || '',
        actif: tiers.actif !== undefined ? tiers.actif : true
      });
    } else {
      setFormData({
        type: 'CLIENT',
        nom: '',
        adresse: '',
        telephone: '',
        email: '',
        siteWeb: '',
        matriculeFiscal: '',
        actif: true
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedTiers(null);
  };

  // Gestion de la boîte de dialogue des détails
  const handleOpenDetailsDialog = async (tiers) => {
    setSelectedTiers(tiers);
    setDetailsTab(0);
    
    try {
      setLoadingTransactions(true);
      setLoadingPaiements(true);
      
      const [resTransactions, resPaiements] = await Promise.all([
        apiClient.get(`${config.backendURL}/tiers/${tiers._id}/transactions`),
        apiClient.get(`${config.backendURL}/tiers/${tiers._id}/paiements`)
      ]);

      setTiersTransactions(resTransactions.data);
      setTiersPaiements(resPaiements.data);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur de chargement des données", severity: "error" });
    } finally {
      setLoadingTransactions(false);
      setLoadingPaiements(false);
    }
    
    setOpenDetailsDialog(true);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedTiers(null);
  };

  // Gestion des changements de formulaire
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    const val = name === 'actif' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    
    // Effacer l'erreur lorsque l'utilisateur modifie le champ
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validation du formulaire
  const validateForm = () => {
    const errors = {};
    
    if (!formData.nom.trim()) errors.nom = "Le nom est obligatoire";
    if (!formData.adresse.trim()) errors.adresse = "L'adresse est obligatoire";
    
    if (formData.telephone && !/^[0-9]{8}$/.test(formData.telephone)) {
      errors.telephone = "Le numéro doit contenir 8 chiffres";
    }
    
    if (formData.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      errors.email = "Format d'email invalide";
    }
    
    if (formData.type !== 'FOURNISSEUR' && !formData.matriculeFiscal) {
      errors.matriculeFiscal = "Matricule fiscal obligatoire pour ce type";
    }
    
    if (formData.matriculeFiscal && !/^[0-9]{7}[A-Za-z]{3}$/.test(formData.matriculeFiscal)) {
      errors.matriculeFiscal = "Format invalide (7 chiffres + 3 lettres)";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Sauvegarde d'un tiers
  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      if (selectedTiers) {
        await apiClient.put(`${config.backendURL}/tiers/${selectedTiers._id}`, formData);
        setSnackbar({ open: true, message: "Tiers modifié avec succès", severity: "success" });
      } else {
        await apiClient.post(`${config.backendURL}/tiers`, formData);
        setSnackbar({ open: true, message: "Tiers ajouté avec succès", severity: "success" });
      }
      handleCloseDialog();
      fetchTiers();
    } catch (error) {
      console.error("Erreur API:", error.response?.data || error.message);
      
      // Gestion des erreurs de validation du backend
      if (error.response?.data?.errors) {
        const backendErrors = {};
        Object.entries(error.response.data.errors).forEach(([field, message]) => {
          backendErrors[field] = message;
        });
        setFormErrors(backendErrors);
      } else {
        setSnackbar({
          open: true,
          message: error.response?.data?.message || "Erreur lors de l'enregistrement",
          severity: "error"
        });
      }
    }
  };

  // Suppression d'un tiers
  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous supprimer ce tiers ? Cette action est irréversible.")) {
      try {
        await apiClient.delete(`${config.backendURL}/tiers/${id}`);
        setSnackbar({ open: true, message: "Tiers supprimé avec succès", severity: "success" });
        fetchTiers();
      } catch (error) {
        console.error(error);
        setSnackbar({ open: true, message: "Erreur lors de la suppression", severity: "error" });
      }
    }
  };

  // Filtrage des tiers
  const filteredTiers = tiers.filter(t => {
    const matchesSearch = t.nom.toLowerCase().includes(searchText.toLowerCase()) || 
                          t.email?.toLowerCase().includes(searchText.toLowerCase()) ||
                          t.matriculeFiscal?.toLowerCase().includes(searchText.toLowerCase());
    
    if (filter === 'TOUS') return matchesSearch;
    return t.type === filter && matchesSearch;
  });

  // Tri des tiers
  const sortedTiers = [...filteredTiers].sort((a, b) => {
    switch(sortBy) {
      case 'nom': return a.nom.localeCompare(b.nom);
      case 'type': return a.type.localeCompare(b.type);
      case 'solde': return (a.soldeCourant || 0) - (b.soldeCourant || 0);
      default: return a.nom.localeCompare(b.nom);
    }
  });
  

 const columns = [
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getTiersTypeIcon(params.value)}
          <span>{params.value}</span>
        </Box>
      )
    },
    { field: 'nom', headerName: 'Nom', flex: 1 },
    { 
      field: 'contact', 
      headerName: 'Contact', 
      flex: 1.5,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">{params.row.telephone}</Typography>
          <Typography variant="body2" color="text.secondary">
            {params.row.email}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'soldeCourant', 
      headerName: 'Solde', 
      width: 150,
      type: 'number',
      renderCell: (params) => (
        <Typography 
          color={params.value < 0 ? 'error.main' : params.value > 0 ? 'success.main' : 'text.primary'}
          fontWeight={500}
        >
          {params.value?.toFixed(2) || '0.00'} TND
        </Typography>
      )
    },
    {
      field: 'statut',
      headerName: 'Statut',
      width: 150,
      renderCell: (params) => {
        const status = getStatusChip(params.row.actif, params.row.soldeCourant);
        return (
          <Chip 
            icon={status.icon}
            label={status.label}
            color={status.color}
            size="small"
          />
        );
      }
    },
    {
      field: 'actions', 
      headerName: 'Actions', 
      width: 230, 
      renderCell: (params) => (
        <Box>
          <Tooltip title="Nouvelle transaction">
            <IconButton 
              color="secondary" 
              onClick={() => navigate(`/transactions/nouveau?tiersId=${params.row._id}`)}
            >
              <Receipt />
            </IconButton>
          </Tooltip>
          <Tooltip title="Voir détails">
            <IconButton color="info" onClick={() => handleOpenDetailsDialog(params.row)}>
              <Visibility />
            </IconButton>
          </Tooltip>
          <Tooltip title="Modifier">
            <IconButton color="primary" onClick={() => handleOpenDialog(params.row)}>
              <Edit />
            </IconButton>
          </Tooltip>
		  <Tooltip title="Supprimer">
        <IconButton 
          color="error" 
          onClick={() => handleDelete(params.row._id)}
        >
          <Delete />
        </IconButton>
      </Tooltip>
        </Box>
      )
    }
  ];

  return (
    <Box>
      {/* En-tête avec titre et bouton d'ajout */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Gestion des Tiers</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Ajouter un tiers
        </Button>
      </Box>

      {/* Barre de filtres et recherche */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Rechercher un tiers..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Type de tiers</InputLabel>
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                label="Type de tiers"
              >
                <MenuItem value="TOUS">Tous les types</MenuItem>
                <MenuItem value="CLIENT">Clients</MenuItem>
                <MenuItem value="FOURNISSEUR">Fournisseurs</MenuItem>
                <MenuItem value="AUTRE">Autres</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Trier par</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Trier par"
              >
                <MenuItem value="nom">Nom</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="solde">Solde</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ImportExport />}
              onClick={() => alert("Fonctionnalité d'import/export à implémenter")}
            >
              Importer
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tableau des tiers */}
      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>
      ) : (
        <DataGrid
          rows={sortedTiers}
          columns={columns}
          getRowId={(row) => row._id}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[5, 10, 25]}
          disableSelectionOnClick
          components={{
            Toolbar: GridToolbar,
          }}
          componentsProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
          }}
          sx={{ 
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(64, 224, 208, 0.08)',
            }
          }}
        />
      )}

      {/* Boîte de dialogue pour ajouter/modifier un tiers */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTiers ? "Modifier un tiers" : "Ajouter un tiers"}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Formulaire avec validation */}
          <FormControl fullWidth>
            <InputLabel>Type de tiers *</InputLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={handleChange}
              label="Type de tiers *"
            >
              <MenuItem value="CLIENT">Client</MenuItem>
              <MenuItem value="FOURNISSEUR">Fournisseur</MenuItem>
              <MenuItem value="AUTRE">Autre</MenuItem>
            </Select>
          </FormControl>

         <TextField 
    label="Nom *" 
    name="nom" 
    value={formData.nom} 
    onChange={(e) => {
      handleChange(e);
      checkForDuplicates(e.target.value);
    }}
    fullWidth
    error={!!formErrors.nom}
    helperText={formErrors.nom}
  />

  {similarTiers.length > 0 && (
    <Paper sx={{ p: 2, mt: 1, bgcolor: 'warning.light' }}>
      <Typography variant="subtitle2" color="warning.dark" gutterBottom>
        Attention : Tiers similaires existants
      </Typography>
      {similarTiers.map(tier => (
        <Chip
          key={tier._id}
          label={`${tier.nom} (${tier.type}) - ${tier.matriculeFiscal}`}
          sx={{ m: 0.5 }}
          onDelete={() => window.open(`/tiers/${tier._id}`, '_blank')}
        />
      ))}
    </Paper>
  )}

          <TextField 
            label="Adresse *" 
            name="adresse" 
            value={formData.adresse} 
            onChange={handleChange} 
            fullWidth
            multiline
            rows={2}
            error={!!formErrors.adresse}
            helperText={formErrors.adresse}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Téléphone" 
                name="telephone" 
                value={formData.telephone} 
                onChange={handleChange} 
                fullWidth
                error={!!formErrors.telephone}
                helperText={formErrors.telephone}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Email" 
                name="email" 
                type="email"
                value={formData.email} 
                onChange={handleChange} 
                fullWidth
                error={!!formErrors.email}
                helperText={formErrors.email}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Site Web" 
                name="siteWeb" 
                value={formData.siteWeb} 
                onChange={handleChange} 
                fullWidth
                error={!!formErrors.siteWeb}
                helperText={formErrors.siteWeb}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label={formData.type === 'FOURNISSEUR' ? "Matricule Fiscal" : "Matricule Fiscal *"} 
                name="matriculeFiscal" 
                value={formData.matriculeFiscal} 
                onChange={handleChange} 
                fullWidth
                error={!!formErrors.matriculeFiscal}
                helperText={formErrors.matriculeFiscal}
              />
            </Grid>
          </Grid>

          <FormControlLabel
            control={
              <Switch
                checked={formData.actif}
                onChange={handleChange}
                name="actif"
              />
            }
            label="Tiers actif"
          />

          {Object.keys(formErrors).length > 0 && (
            <Alert severity="error">
              Veuillez corriger les erreurs dans le formulaire
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {selectedTiers ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue pour les détails du tiers */}
      <Dialog 
        open={openDetailsDialog} 
        onClose={handleCloseDetailsDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedTiers && (
          <>
            <DialogTitle sx={{ p: 0 }}>
              <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'white' }}>
                    {getTiersTypeIcon(selectedTiers.type)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{selectedTiers.nom}</Typography>
                    <Typography variant="body2">
                      {selectedTiers.type} • {selectedTiers.matriculeFiscal}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Tabs value={detailsTab} onChange={(e, val) => setDetailsTab(val)} sx={{ px: 2 }}>
                <Tab label="Informations" />
                <Tab label="Transactions" />
                <Tab label="Paiements" />
                <Tab label="Documents" />
              </Tabs>
            </DialogTitle>
            
            <DialogContent>
              {/* Onglet Informations */}
              {detailsTab === 0 && (
                <Box sx={{ pt: 2 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Coordonnées
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        <Stack spacing={1}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Adresse</Typography>
                            <Typography>{selectedTiers.adresse}</Typography>
                          </Box>
                          
                          <Box>
                            <Typography variant="caption" color="text.secondary">Téléphone</Typography>
                            <Typography>{selectedTiers.telephone || 'Non spécifié'}</Typography>
                          </Box>
                          
                          <Box>
                            <Typography variant="caption" color="text.secondary">Email</Typography>
                            <Typography>{selectedTiers.email || 'Non spécifié'}</Typography>
                          </Box>
                          
                          {selectedTiers.siteWeb && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">Site Web</Typography>
                              <Typography>{selectedTiers.siteWeb}</Typography>
                            </Box>
                          )}
                        </Stack>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Informations fiscales
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        <Stack spacing={1}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Matricule fiscal</Typography>
                            <Typography>{selectedTiers.matriculeFiscal || 'Non spécifié'}</Typography>
                          </Box>
                          
                          <Box>
                            <Typography variant="caption" color="text.secondary">Statut</Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Chip 
                                icon={getStatusChip(selectedTiers.actif, selectedTiers.soldeCourant).icon}
                                label={getStatusChip(selectedTiers.actif, selectedTiers.soldeCourant).label}
                                color={getStatusChip(selectedTiers.actif, selectedTiers.soldeCourant).color}
                                size="small"
                              />
                            </Box>
                          </Box>
                          
                          <Box>
                            <Typography variant="caption" color="text.secondary">Solde actuel</Typography>
                            <Typography 
                              color={(selectedTiers.soldeCourant || 0) < 0 ? 'error.main' : 'success.main'}
                              fontWeight="bold"
                            >
                              {(selectedTiers.soldeCourant || 0).toFixed(2)} TND
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                      
                      <Paper sx={{ p: 2, mt: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          Notes
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        <Typography variant="body2" color="text.secondary">
                          Aucune note disponible pour ce tiers.
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
             {/* Onglet Transactions */}
  {detailsTab === 1 && (
    <Box sx={{ pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Historique des transactions</Typography>
        <Button 
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate(`/transactions/nouveau?tiersId=${selectedTiers._id}`)}
        >
          Nouvelle transaction
        </Button>
      </Box>
      
      {loadingTransactions ? (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>Chargement des transactions...</Typography>
        </Box>
      ) : (
        <DataGrid
          rows={tiersTransactions}
          columns={transactionsColumns}
          autoHeight
          density="compact"
          getRowId={(row) => row._id}
        />
      )}
    </Box>
  )}

  {/* Onglet Paiements */}
  {detailsTab === 2 && (
    <Box sx={{ pt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Historique des paiements</Typography>
        <Button 
          variant="contained"
          startIcon={<Payment />}
          onClick={() => navigate(`/paiements/nouveau?tiersId=${selectedTiers._id}`)}
        >
          Nouveau paiement
        </Button>
      </Box>

      {loadingPaiements ? (
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>Chargement des paiements...</Typography>
        </Box>
      ) : (
        <DataGrid
          rows={tiersPaiements}
          columns={paiementsColumns}
          autoHeight
          density="compact"
          getRowId={(row) => row._id}
        />
      )}
    </Box>
  )}
              
              {/* Onglet Documents */}
              {detailsTab === 3 && (
                <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                  <Typography variant="body1" color="text.secondary">
                    La gestion des documents sera implémentée dans une phase ultérieure.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                  >
                    Ajouter un document
                  </Button>
                </Box>
              )}
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => handleOpenDialog(selectedTiers)} color="primary">
                Modifier
              </Button>
              <Button onClick={handleCloseDetailsDialog}>
                Fermer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        autoHideDuration={4000}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}