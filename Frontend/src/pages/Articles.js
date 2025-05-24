// client/src/pages/Articles.js - Page de gestion des articles (VERSION CORRIGÉE)
import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Typography, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Tooltip, CircularProgress, Alert, InputAdornment,
  Chip, Paper, Grid, FormControl, InputLabel, Select, MenuItem, 
  FormControlLabel, Switch, Stack, List, ListItem, ListItemText
} from '@mui/material';
import { 
  Add, Edit, Delete, Search, FilterList, ImportExport, CheckCircle, Cancel, Category, Inventory2, Close
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
    prixAchatHT: 0,
    prixAchatMoyen: 0,
    dernierPrixAchat: 0,
    codeBarre: '',
    categorie: '',
    tauxTaxe: 19,
    actif: true,
    stock: 0
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('TOUS');
  const [categorieFilter, setCategorieFilter] = useState('TOUTES');
  const [sortBy, setSortBy] = useState('designation');
  const [formErrors, setFormErrors] = useState({});
  const [categories, setCategories] = useState([]);

  // État pour la vue détaillée
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fonction pour charger les catégories
  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/api/parametres/categories-articles');
      console.log('Catégories chargées:', response.data);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      setCategories([]); // Initialiser avec un tableau vide
      setSnackbar({
        open: true,
        message: 'Erreur lors du chargement des catégories',
        severity: 'warning'
      });
    }
  };

  // Fonction pour charger tous les articles - VERSION CORRIGÉE
  const fetchArticles = async () => {
    try {
      setLoading(true);
      console.log('Début du chargement des articles...');
      
      // Utiliser les paramètres corrects selon votre API
      const res = await apiClient.get('/api/articles', {
        params: {
          actif: true // ou ne pas mettre ce paramètre si vous voulez tous les articles
        }
      });
      
      console.log('Réponse complète de l\'API:', res);
      console.log('Données reçues:', res.data);
      
      let articlesData = [];
      
      // Gérer différents formats de réponse
      if (res.data) {
        if (res.data.success && Array.isArray(res.data.data)) {
          // Format: { success: true, data: [...] }
          articlesData = res.data.data;
          console.log('Format avec success:', articlesData);
        } else if (Array.isArray(res.data)) {
          // Format: [...]
          articlesData = res.data;
          console.log('Format tableau direct:', articlesData);
        } else if (res.data.articles && Array.isArray(res.data.articles)) {
          // Format: { articles: [...] }
          articlesData = res.data.articles;
          console.log('Format avec propriété articles:', articlesData);
        } else {
          console.error('Structure de réponse non reconnue:', res.data);
          articlesData = [];
        }
      }
      
      console.log(`${articlesData.length} articles chargés:`, articlesData);
      setArticles(articlesData);
      
      if (articlesData.length === 0) {
        setSnackbar({ 
          open: true, 
          message: "Aucun article trouvé", 
          severity: "info" 
        });
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des articles:', error);
      console.error('Détails de l\'erreur:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      setArticles([]);
      
      // Message d'erreur plus informatif
      let errorMessage = "Erreur de chargement des articles";
      if (error.response?.status === 401) {
        errorMessage = "Non autorisé - Veuillez vous reconnecter";
      } else if (error.response?.status === 403) {
        errorMessage = "Accès interdit";
      } else if (error.response?.status === 404) {
        errorMessage = "Endpoint non trouvé - Vérifiez l'URL de l'API";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    console.log('Montage du composant - Chargement des données...');
    loadCategories();
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
        prixAchatHT: article.prixAchatHT || 0,
        prixAchatMoyen: article.prixAchatMoyen || 0,
        dernierPrixAchat: article.dernierPrixAchat || 0,
        codeBarre: article.codeBarre || '',
        categorie: article.categorie || '',
        tauxTaxe: article.tauxTaxe || 19,
        actif: article.actif !== undefined ? article.actif : true,
        stock: article.stock || 0
      });
    } else {
      setFormData({
        code: '',
        designation: '',
        type: 'PRODUIT',
        prixVenteHT: 0,
        prixAchatHT: 0,
        prixAchatMoyen: 0,
        dernierPrixAchat: 0,
        codeBarre: '',
        categorie: '',
        tauxTaxe: 19,
        actif: true,
        stock: 0
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
              ['prixVenteHT', 'prixAchatHT', 'tauxTaxe', 'stock'].includes(name) ? Number(value) : value;
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
    if (!formData.categorie.trim()) errors.categorie = "La catégorie est obligatoire";
    
    if (formData.prixVenteHT < 0) {
      errors.prixVenteHT = "Le prix de vente ne peut pas être négatif";
    }
    
    if (formData.prixAchatHT < 0) {
      errors.prixAchatHT = "Le prix d'achat ne peut pas être négatif";
    }
    
    if (formData.tauxTaxe < 0 || formData.tauxTaxe > 100) {
      errors.tauxTaxe = "Le taux doit être entre 0 et 100%";
    }

    if (formData.stock < 0) {
      errors.stock = "Le stock ne peut pas être négatif";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Sauvegarde d'un article
  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      if (selectedArticle) {
        await apiClient.put(`/api/articles/${selectedArticle._id}`, formData);
        setSnackbar({ open: true, message: "Article modifié avec succès", severity: "success" });
      } else {
        await apiClient.post('/api/articles', formData);
        setSnackbar({ open: true, message: "Article ajouté avec succès", severity: "success" });
      }
      handleCloseDialog();
      await fetchArticles(); // Recharger la liste
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
    } finally {
      setLoading(false);
    }
  };

  // Suppression d'un article
  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous désactiver cet article ? Cette action peut être annulée plus tard.")) {
      try {
        await apiClient.delete(`/api/articles/${id}`);
        setSnackbar({ open: true, message: "Article désactivé avec succès", severity: "success" });
        await fetchArticles(); // Recharger la liste
      } catch (error) {
        console.error(error);
        setSnackbar({ open: true, message: "Erreur lors de la désactivation", severity: "error" });
      }
    }
  };

  // Filtrage des articles - PROTECTION RENFORCÉE
  const filteredArticles = React.useMemo(() => {
    if (!Array.isArray(articles)) {
      console.warn('Articles n\'est pas un tableau:', articles);
      return [];
    }

    return articles.filter(article => {
      if (!article) return false;

      const matchesSearch = searchText === '' || 
        (article.designation && article.designation.toLowerCase().includes(searchText.toLowerCase())) || 
        (article.code && article.code.toLowerCase().includes(searchText.toLowerCase())) ||
        (article.codeBarre && article.codeBarre.toLowerCase().includes(searchText.toLowerCase()));
      
      const matchesType = filter === 'TOUS' || article.type === filter;
      const matchesCategorie = categorieFilter === 'TOUTES' || article.categorie === categorieFilter;
      
      return matchesSearch && matchesType && matchesCategorie;
    });
  }, [articles, searchText, filter, categorieFilter]);

  // Tri des articles
  const sortedArticles = React.useMemo(() => {
    return [...filteredArticles].sort((a, b) => {
      if (!a || !b) return 0;
      
      switch(sortBy) {
        case 'code': 
          return (a.code || '').localeCompare(b.code || '');
        case 'designation': 
          return (a.designation || '').localeCompare(b.designation || '');
        case 'categorie': 
          return (a.categorie || '').localeCompare(b.categorie || '');
        case 'prixVenteHT': 
          return (a.prixVenteHT || 0) - (b.prixVenteHT || 0);
        case 'prixAchatHT': 
          return (a.prixAchatHT || 0) - (b.prixAchatHT || 0);
        default: 
          return (a.designation || '').localeCompare(b.designation || '');
      }
    });
  }, [filteredArticles, sortBy]);

  // Configuration des colonnes du DataGrid
  const columns = [
    { 
      field: 'code', 
      headerName: 'Code', 
      width: 100,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'designation', 
      headerName: 'Désignation', 
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.value}
        </Typography>
      )
    },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getArticleTypeIcon(params.value)}
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      )
    },
    { 
      field: 'categorie', 
      headerName: 'Catégorie', 
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          variant="outlined"
          sx={{ minWidth: 100 }}
        />
      )
    },
    { 
      field: 'prixVenteHT', 
      headerName: 'Prix HT', 
      width: 120,
      type: 'number',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {(params.value || 0).toFixed(2)} TND
        </Typography>
      )
    },
    { 
      field: 'prixTTC', 
      headerName: 'Prix TTC', 
      width: 120,
      type: 'number',
      valueGetter: (params) => {
        const prixHT = params.row.prixVenteHT || 0;
        const taux = params.row.tauxTaxe || 0;
        return prixHT * (1 + taux / 100);
      },
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {(params.value || 0).toFixed(2)} TND
        </Typography>
      )
    },
    { 
      field: 'stock', 
      headerName: 'Stock', 
      width: 100,
      type: 'number',
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          color={(params.value || 0) > 0 ? "success.main" : "error.main"}
          fontWeight="medium"
        >
          {params.value || 0}
        </Typography>
      )
    },
    {
      field: 'actif',
      headerName: 'Statut',
      width: 100,
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
      field: 'actions', 
      headerName: 'Actions', 
      width: 120, 
      renderCell: (params) => (
        <Box>
          <Tooltip title="Modifier">
            <IconButton color="primary" onClick={(e) => {
              e.stopPropagation();
              handleOpenDialog(params.row);
            }}>
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.actif ? "Désactiver" : "Réactiver"}>
            <IconButton 
              color={params.row.actif ? "error" : "success"} 
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(params.row._id);
              }}
            >
              {params.row.actif ? <Delete /> : <CheckCircle />}
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];

  // Gestionnaire pour ouvrir la vue détaillée
  const handleRowClick = (params) => {
    setSelectedArticle(params.row);
    setDetailDialogOpen(true);
  };

  // Gestionnaire pour fermer la vue détaillée
  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedArticle(null);
  };

  console.log('Rendu - Articles:', articles.length, 'Filtrés:', filteredArticles.length, 'Triés:', sortedArticles.length);

  return (
    <Box>
      {/* En-tête avec titre et bouton d'ajout */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Gestion des Articles</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Ajouter un article
        </Button>
      </Box>

      {/* Statistiques rapides */}
      {!loading && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="h6" color="primary">
                {articles.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total articles
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="h6" color="success.main">
                {articles.filter(a => a.actif).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Articles actifs
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="h6" color="warning.main">
                {articles.filter(a => a.stock <= 5).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Stock faible
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="h6" color="error.main">
                {articles.filter(a => a.stock === 0).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Rupture stock
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Barre de filtres et recherche */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
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
          <Grid item xs={6} md={2}>
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
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={categorieFilter}
                onChange={(e) => setCategorieFilter(e.target.value)}
                label="Catégorie"
              >
                <MenuItem value="TOUTES">Toutes les catégories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat._id || cat.nom} value={cat.nom}>
                    {cat.nom}
                  </MenuItem>
                ))}
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
                <MenuItem value="categorie">Catégorie</MenuItem>
                <MenuItem value="prixVenteHT">Prix vente</MenuItem>
                <MenuItem value="prixAchatHT">Prix achat</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ImportExport />}
              onClick={() => fetchArticles()}
              disabled={loading}
            >
              Actualiser
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tableau des articles */}
      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 5, mb: 5 }}>
          <CircularProgress size={60} />
          <Typography sx={{ mt: 2 }}>Chargement des articles...</Typography>
        </Box>
      ) : sortedArticles.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            Aucun article trouvé
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {articles.length === 0 
              ? "Commencez par ajouter votre premier article"
              : "Aucun article ne correspond aux critères de recherche"
            }
          </Typography>
          {articles.length === 0 && (
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={() => handleOpenDialog()}
              sx={{ mt: 2 }}
            >
              Ajouter le premier article
            </Button>
          )}
        </Paper>
      ) : (
        <DataGrid
          rows={sortedArticles}
          columns={columns}
          getRowId={(row) => row._id}
          autoHeight
          pageSize={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          disableSelectionOnClick
          onRowClick={handleRowClick}
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
              cursor: 'pointer'
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
              <TextField 
                label="Code à barre" 
                name="codeBarre" 
                value={formData.codeBarre} 
                onChange={handleChange} 
                fullWidth
                error={!!formErrors.codeBarre}
                helperText={formErrors.codeBarre}
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Catégorie *</InputLabel>
                <Select
                  name="categorie"
                  value={formData.categorie}
                  onChange={handleChange}
                  label="Catégorie *"
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat._id} value={cat.nom}>
                      {cat.nom}
                    </MenuItem>
                  ))}
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
                label="Prix d'achat moyen HT" 
                name="prixAchatMoyen" 
                type="number"
                value={formData.prixAchatMoyen} 
                disabled
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField 
                label="Dernier prix d'achat HT" 
                name="dernierPrixAchat" 
                type="number"
                value={formData.dernierPrixAchat} 
                disabled
                fullWidth
                InputProps={{
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>,
                }}
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
          </Grid>

          <Grid container spacing={2}>
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

      {/* Boîte de dialogue de détails */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetailDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedArticle && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Détails de l'article</Typography>
                <Box>
                  <Tooltip title="Modifier">
                    <IconButton onClick={() => {
                      handleCloseDetailDialog();
                      handleOpenDialog(selectedArticle);
                    }}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Fermer">
                    <IconButton onClick={handleCloseDetailDialog}>
                      <Close />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Informations générales
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Code" 
                          secondary={selectedArticle.code}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Désignation" 
                          secondary={selectedArticle.designation}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Type" 
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getArticleTypeIcon(selectedArticle.type)}
                              {selectedArticle.type}
                            </Box>
                          }
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Catégorie" 
                          secondary={selectedArticle.categorie}
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Informations financières
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Prix d'achat HT" 
                          secondary={`${selectedArticle.prixAchatHT.toFixed(2)} TND`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Prix d'achat moyen HT" 
                          secondary={`${selectedArticle.prixAchatMoyen.toFixed(2)} TND`}
                        />
						</ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Dernier prix d'achat HT" 
                          secondary={`${selectedArticle.dernierPrixAchat.toFixed(2)} TND`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Prix de vente HT" 
                          secondary={`${selectedArticle.prixVenteHT.toFixed(2)} TND`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Prix de vente TTC" 
                          secondary={`${(selectedArticle.prixVenteHT * (1 + selectedArticle.tauxTaxe / 100)).toFixed(2)} TND`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Taux TVA" 
                          secondary={`${selectedArticle.tauxTaxe}%`}
                        />
                      </ListItem>
                      {selectedArticle.prixAchatHT > 0 && (
                        <ListItem>
                          <ListItemText 
                            primary="Marge" 
                            secondary={
                              <Chip 
                                label={`${(((selectedArticle.prixVenteHT - selectedArticle.prixAchatHT) / selectedArticle.prixAchatHT) * 100).toFixed(1)}%`}
                                color={(((selectedArticle.prixVenteHT - selectedArticle.prixAchatHT) / selectedArticle.prixAchatHT) * 100) > 0 ? "success" : "error"}
                                size="small"
                              />
                            }
                          />
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Stock et statut
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Stock actuel" 
                          secondary={
                            <Typography 
                              color={selectedArticle.stock > 0 ? "success.main" : "error.main"}
                              fontWeight="medium"
                            >
                              {selectedArticle.stock} unités
                            </Typography>
                          }
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Statut" 
                          secondary={
                            <Chip 
                              icon={selectedArticle.actif ? <CheckCircle fontSize="small" /> : <Cancel fontSize="small" />}
                              label={selectedArticle.actif ? "Actif" : "Inactif"}
                              color={selectedArticle.actif ? "success" : "default"}
                              size="small"
                            />
                          }
                        />
                      </ListItem>
                      {selectedArticle.codeBarre && (
                        <ListItem>
                          <ListItemText 
                            primary="Code à barres" 
                            secondary={selectedArticle.codeBarre}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Informations calculées
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Valeur stock (prix achat)" 
                          secondary={`${(selectedArticle.stock * selectedArticle.prixAchatHT).toFixed(2)} TND`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Valeur stock (prix vente)" 
                          secondary={`${(selectedArticle.stock * selectedArticle.prixVenteHT).toFixed(2)} TND`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Bénéfice potentiel" 
                          secondary={
                            <Typography 
                              color={selectedArticle.stock * (selectedArticle.prixVenteHT - selectedArticle.prixAchatHT) > 0 ? "success.main" : "error.main"}
                              fontWeight="medium"
                            >
                              {(selectedArticle.stock * (selectedArticle.prixVenteHT - selectedArticle.prixAchatHT)).toFixed(2)} TND
                            </Typography>
                          }
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetailDialog}>Fermer</Button>
              <Button 
                variant="contained" 
                startIcon={<Edit />}
                onClick={() => {
                  handleCloseDetailDialog();
                  handleOpenDialog(selectedArticle);
                }}
              >
                Modifier
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}