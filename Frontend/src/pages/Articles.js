// client/src/pages/Articles.js - Page de gestion des articles
import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Typography, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, CircularProgress, Alert, InputAdornment,
  Chip, Paper, Grid, FormControl, InputLabel, Select, MenuItem, 
  FormControlLabel, Switch, Stack
} from '@mui/material';
import { 
  Add, Edit, Delete, Search, FilterList, ImportExport, CheckCircle, Cancel, Category, Inventory2
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { useDebouncedCallback } from 'use-debounce';
import apiClient from '../utils/apiClient';

// Fonction pour obtenir l'icône du type d'article
const getArticleTypeIcon = (type) => {
  switch (type) {
    case 'PRODUIT': return <Inventory2 />;
    case 'SERVICE': return <Category />;
    default: return <Inventory2 />;
  }
};

export default function ArticlesPage() {
  // États principaux
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    designation: '',
    type: 'PRODUIT',
    prixVenteHT: 0,
    prixAchatHT: 0, // Ajout du prix d'achat
    tauxTaxe: 19,
    actif: true
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('TOUS');
  const [sortBy, setSortBy] = useState('designation');
  const [formErrors, setFormErrors] = useState({});

  // Fonction pour charger tous les articles
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/articles');
      setArticles(res.data);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: "Erreur de chargement des articles", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Gestion de la boîte de dialogue de création/modification
  const handleOpenDialog = (article = null) => {
    setSelectedArticle(article);
    if (article) {
      setFormData({
        code: article.code || '',
        designation: article.designation || '',
        type: article.type || 'PRODUIT',
        prixVenteHT: article.prixVenteHT || 0,
        prixAchatHT: article.prixAchatHT || 0, // Ajout du prix d'achat
        tauxTaxe: article.tauxTaxe || 19,
        actif: article.actif !== undefined ? article.actif : true
      });
    } else {
      setFormData({
        code: '',
        designation: '',
        type: 'PRODUIT',
        prixVenteHT: 0,
        prixAchatHT: 0, // Ajout du prix d'achat
        tauxTaxe: 19,
        actif: true
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedArticle(null);
  };

  // Gestion des changements de formulaire
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    const val = name === 'actif' ? checked : 
              ['prixVenteHT', 'prixAchatHT', 'tauxTaxe'].includes(name) ? Number(value) : value; // Ajout du prix d'achat
    setFormData(prev => ({ ...prev, [name]: val }));
    
    // Effacer l'erreur lorsque l'utilisateur modifie le champ
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Calcul du prix TTC
  const calculatePrixTTC = () => {
    const { prixVenteHT, tauxTaxe } = formData;
    return prixVenteHT * (1 + tauxTaxe / 100);
  };

  // Calcul de la marge
  const calculateMarge = () => {
    const { prixVenteHT, prixAchatHT } = formData;
    if (!prixAchatHT) return 0;
    return ((prixVenteHT - prixAchatHT) / prixAchatHT) * 100;
  };

  // Validation du formulaire
  const validateForm = () => {
    const errors = {};
    
    if (!formData.code.trim()) errors.code = "Le code est obligatoire";
    if (!formData.designation.trim()) errors.designation = "La désignation est obligatoire";
    
    if (formData.prixVenteHT < 0) {
      errors.prixVenteHT = "Le prix de vente ne peut pas être négatif";
    }
    
    if (formData.prixAchatHT < 0) { // Validation du prix d'achat
      errors.prixAchatHT = "Le prix d'achat ne peut pas être négatif";
    }
    
    if (formData.tauxTaxe < 0 || formData.tauxTaxe > 100) {
      errors.tauxTaxe = "Le taux doit être entre 0 et 100%";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Sauvegarde d'un article
  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      if (selectedArticle) {
        await apiClient.put(`/api/articles/${selectedArticle._id}`, formData);
        setSnackbar({ open: true, message: "Article modifié avec succès", severity: "success" });
      } else {
        await apiClient.post('/api/articles', formData);
        setSnackbar({ open: true, message: "Article ajouté avec succès", severity: "success" });
      }
      handleCloseDialog();
      fetchArticles();
    } catch (error) {
      console.error("Erreur API:", error.response?.data || error.message);
      
      if (error.response?.data?.message === 'Code article déjà utilisé') {
        setFormErrors({ ...formErrors, code: 'Ce code article est déjà utilisé' });
      } else {
        setSnackbar({
          open: true,
          message: error.response?.data?.message || "Erreur lors de l'enregistrement",
          severity: "error"
        });
      }
    }
  };

  // Suppression d'un article
  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous désactiver cet article ? Cette action peut être annulée plus tard.")) {
      try {
        await apiClient.delete(`/api/articles/${id}`);
        setSnackbar({ open: true, message: "Article désactivé avec succès", severity: "success" });
        fetchArticles();
      } catch (error) {
        console.error(error);
        setSnackbar({ open: true, message: "Erreur lors de la désactivation", severity: "error" });
      }
    }
  };

  // Filtrage des articles
  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.designation.toLowerCase().includes(searchText.toLowerCase()) || 
                          article.code.toLowerCase().includes(searchText.toLowerCase());
    
    if (filter === 'TOUS') return matchesSearch;
    return article.type === filter && matchesSearch;
  });

  // Tri des articles
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    switch(sortBy) {
      case 'code': return a.code.localeCompare(b.code);
      case 'designation': return a.designation.localeCompare(b.designation);
      case 'prixVenteHT': return a.prixVenteHT - b.prixVenteHT;
      case 'prixAchatHT': return (a.prixAchatHT || 0) - (b.prixAchatHT || 0); // Tri par prix d'achat
      default: return a.designation.localeCompare(b.designation);
    }
  });

  const columns = [
    { 
      field: 'code', 
      headerName: 'Code', 
      width: 150 
    },
    { 
      field: 'designation', 
      headerName: 'Désignation', 
      flex: 1 
    },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getArticleTypeIcon(params.value)}
          <span>{params.value}</span>
        </Box>
      )
    },
    { 
      field: 'prixAchatHT', 
      headerName: 'Prix Achat HT', 
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <Typography>
          {params.value ? params.value.toFixed(2) : "0.00"} TND
        </Typography>
      )
    },
    { 
      field: 'prixVenteHT', 
      headerName: 'Prix HT', 
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <Typography>
          {params.value.toFixed(2)} TND
        </Typography>
      )
    },
    { 
      field: 'prixTTC', 
      headerName: 'Prix TTC', 
      width: 120,
      type: 'number',
      valueGetter: (params) => {
        return params.row.prixVenteHT * (1 + params.row.tauxTaxe / 100);
      },
      renderCell: (params) => (
        <Typography fontWeight={500}>
          {params.value.toFixed(2)} TND
        </Typography>
      )
    },
    { 
      field: 'marge', 
      headerName: 'Marge %', 
      width: 100,
      valueGetter: (params) => {
        if (!params.row.prixAchatHT) return 0;
        return ((params.row.prixVenteHT - params.row.prixAchatHT) / params.row.prixAchatHT) * 100;
      },
      renderCell: (params) => (
        <Typography color={params.value > 0 ? "success.main" : "error.main"}>
          {params.value.toFixed(1)}%
        </Typography>
      )
    },
    { 
      field: 'tauxTaxe', 
      headerName: 'TVA', 
      width: 80,
      renderCell: (params) => (
        <Typography>
          {params.value}%
        </Typography>
      )
    },
    {
      field: 'actif',
      headerName: 'Statut',
      width: 120,
      renderCell: (params) => (
        <Chip 
          icon={params.value ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
          label={params.value ? "Actif" : "Inactif"}
          color={params.value ? "success" : "default"}
          size="small"
        />
      )
    },
	
	{ 
    field: 'stock', 
    headerName: 'Stock', 
    width: 120,
    type: 'number',
    renderCell: (params) => (
      <Typography color={params.value > 0 ? "inherit" : "error"}>
        {params.value}
      </Typography>
    )
  },
	
    {
      field: 'actions', 
      headerName: 'Actions', 
      width: 150, 
      renderCell: (params) => (
        <Box>
          <Tooltip title="Modifier">
            <IconButton color="primary" onClick={() => handleOpenDialog(params.row)}>
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.actif ? "Désactiver" : "Réactiver"}>
            <IconButton 
              color={params.row.actif ? "error" : "success"} 
              onClick={() => handleDelete(params.row._id)}
            >
              {params.row.actif ? <Delete /> : <CheckCircle />}
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
        <Typography variant="h4">Gestion des Articles</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Ajouter un article
        </Button>
      </Box>

      {/* Barre de filtres et recherche */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Rechercher un article..."
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
              <InputLabel>Type d'article</InputLabel>
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                label="Type d'article"
              >
                <MenuItem value="TOUS">Tous les types</MenuItem>
                <MenuItem value="PRODUIT">Produits</MenuItem>
                <MenuItem value="SERVICE">Services</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Trier par</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Trier par"
              >
                <MenuItem value="code">Code</MenuItem>
                <MenuItem value="designation">Désignation</MenuItem>
                <MenuItem value="prixVenteHT">Prix vente</MenuItem>
                <MenuItem value="prixAchatHT">Prix achat</MenuItem>
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

      {/* Tableau des articles */}
      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>
      ) : (
        <DataGrid
          rows={sortedArticles}
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

      {/* Boîte de dialogue pour ajouter/modifier un article */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedArticle ? "Modifier un article" : "Ajouter un article"}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Formulaire avec validation */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Code *" 
                name="code" 
                value={formData.code} 
                onChange={handleChange} 
                fullWidth
                error={!!formErrors.code}
                helperText={formErrors.code}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type d'article *</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  label="Type d'article *"
                >
                  <MenuItem value="PRODUIT">Produit</MenuItem>
                  <MenuItem value="SERVICE">Service</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField 
            label="Désignation *" 
            name="designation" 
            value={formData.designation} 
            onChange={handleChange} 
            fullWidth
            error={!!formErrors.designation}
            helperText={formErrors.designation}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField 
                label="Prix d'achat HT" 
                name="prixAchatHT" 
                type="number"
                value={formData.prixAchatHT} 
                onChange={handleChange} 
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>,
                }}
                error={!!formErrors.prixAchatHT}
                helperText={formErrors.prixAchatHT}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField 
                label="Prix de vente HT *" 
                name="prixVenteHT" 
                type="number"
                value={formData.prixVenteHT} 
                onChange={handleChange} 
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>,
                }}
                error={!!formErrors.prixVenteHT}
                helperText={formErrors.prixVenteHT}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField 
                label="Taux de TVA (%)" 
                name="tauxTaxe" 
                type="number"
                value={formData.tauxTaxe} 
                onChange={handleChange} 
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                error={!!formErrors.tauxTaxe}
                helperText={formErrors.tauxTaxe}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField 
                label="Prix de vente TTC" 
                value={calculatePrixTTC().toFixed(2)} 
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>,
                  readOnly: true,
                }}
                disabled
              />
            </Grid>
			<Grid item xs={12} md={3}>
  <TextField
    label="Stock *"
    name="stock"
    type="number"
    value={formData.stock}
    onChange={handleChange}
    fullWidth
    InputProps={{
      inputProps: { min: 0 }
    }}
    error={!!formErrors.stock}
    helperText={formErrors.stock}
  />
</Grid>
          </Grid>
          
          {/* Affichage de la marge calculée */}
          {formData.prixAchatHT > 0 && (
            <Box sx={{ mt: 1 }}>
              <Chip 
                label={`Marge: ${calculateMarge().toFixed(1)}%`}
                color={calculateMarge() > 0 ? "success" : "error"}
                variant="outlined"
              />
            </Box>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={formData.actif}
                onChange={handleChange}
                name="actif"
              />
            }
            label="Article actif"
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
            {selectedArticle ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
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