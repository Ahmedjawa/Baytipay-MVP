// client/src/components/vente/ArticlesStep.js - Étape 2: Sélection des articles
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Autocomplete, Button, Grid, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Card, CardContent, Dialog, DialogTitle, DialogContent, 
  DialogActions, Divider, Alert, InputAdornment, CircularProgress
} from '@mui/material';

import { 
  Add, 
  Delete, 
  Edit, 
  Search, 
  ShoppingCart, 
  CalculateOutlined, 
  Discount 
} from '@mui/icons-material';

import apiClient from '../../utils/apiClient';
import config from '../../config';

// Définition du composant
function ArticlesStep({ venteData, updateVenteData }) {
  // État du composant
  const [state, setState] = useState({
    articles: [],
    loading: false,
    searchQuery: '',
    openAddDialog: false,
    currentArticle: {
      article: null,
      quantite: 1,
      prixUnitaire: 0,
      remise: 0,
      tva: 19,
      total: 0
    },
    editIndex: -1,
    formErrors: {},
    calculationSummary: {
      sousTotal: 0,
      totalRemise: 0,
      totalHT: 0,
      totalTVA: 0,
      totalTTC: 0
    },  // <-- Fixed: Added missing comma here
    prixUnitaire: 0,
    remise: 0,
    tva: 19, // Taux par défaut en Tunisie
    total: 0
  });

  // Extraction des états du state global pour faciliter l'utilisation
  const { 
    articles, 
    loading, 
    searchQuery, 
    openAddDialog, 
    currentArticle 
  } = state;

  const [editIndex, setEditIndex] = useState(-1); // -1 signifie nouvel article
  const [formErrors, setFormErrors] = useState({});

  // Résumé des calculs
  const [calculationSummary, setCalculationSummary] = useState({
    sousTotal: 0,
    totalRemise: 0,
    totalHT: 0,
    totalTVA: 0,
    totalTTC: 0
  });

  // Fonctions de mise à jour des états
  const setArticles = (articles) => setState(prev => ({ ...prev, articles }));
  const setLoading = (loading) => setState(prev => ({ ...prev, loading }));
  const setSearchQuery = (searchQuery) => setState(prev => ({ ...prev, searchQuery }));
  const setOpenAddDialog = (openAddDialog) => setState(prev => ({ ...prev, openAddDialog }));
  const setCurrentArticle = (currentArticle) => setState(prev => ({ ...prev, currentArticle }));

  // Récupérer la liste des articles au chargement
  useEffect(() => {
    fetchArticles();
  }, []);

  // Recalculer les totaux lorsque les articles changent
  useEffect(() => {
    calculateTotals();
  }, [venteData.articles, venteData.remise]);

  // Récupérer les articles depuis l'API
  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${config.backendURL}/articles`);
      setArticles(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des articles:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calcul des totaux
  const calculateTotals = () => {
    const articles = venteData.articles || [];
    
    // Sous-total (somme des prix unitaires * quantités sans remise)
    const sousTotal = articles.reduce((sum, item) => 
      sum + (item.prixUnitaire * item.quantite), 0);
    
    // Total des remises par ligne
    const totalRemiseLigne = articles.reduce((sum, item) => 
      sum + (item.prixUnitaire * item.quantite * (item.remise / 100)), 0);
    
    // Remise globale
    const remiseGlobale = sousTotal * (venteData.remise / 100);
    
    // Total remise (ligne + globale)
    const totalRemise = totalRemiseLigne + remiseGlobale;
    
    // Total HT après remises
    const totalHT = sousTotal - totalRemise;
    
    // Calcul de la TVA
    const totalTVA = articles.reduce((sum, item) => {
      const montantHT = item.prixUnitaire * item.quantite * (1 - item.remise / 100);
      return sum + (montantHT * (item.tva / 100));
    }, 0);
    
    // Total TTC
    const totalTTC = totalHT + totalTVA;
    
    // Mettre à jour les données de vente
    updateVenteData({
      sousTotal,
      remise: venteData.remise || 0,
      tva: totalTVA,
      totalTTC
    });
    
    // Mettre à jour le résumé des calculs
    setCalculationSummary({
      sousTotal,
      totalRemise,
      totalHT,
      totalTVA,
      totalTTC
    });
  };

  // Filtrer les articles en fonction de la recherche
  const filteredArticles = articles.filter(article =>
    article.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.codeBarre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Gérer la sélection d'un article
  const handleSelectArticle = (article) => {
    if (!article) return;
    
    setCurrentArticle({
      ...currentArticle,
      article,
      prixUnitaire: article.prixVenteHT || 0,
      tva: article.tauxTVA || 19,
    });
    
    // Vérifier la disponibilité
    if ((article.stock || 0) < currentArticle.quantite) {
      setFormErrors({ quantite: `Stock disponible: ${article.stock || 0}` });
    } else {
      setFormErrors({});
    }
  };

  // Gérer les changements dans le formulaire
  const handleCurrentArticleChange = (e) => {
    const { name, value } = e.target;
    
    // Convertir les valeurs numériques
    const numericValue = ['quantite', 'prixUnitaire', 'remise', 'tva'].includes(name)
      ? parseFloat(value) || 0
      : value;
    
    const updatedArticle = { ...currentArticle, [name]: numericValue };
    
    // Validation du stock
    if (name === 'quantite' && updatedArticle.article) {
      if ((updatedArticle.article.stock || 0) < numericValue) {
        setFormErrors({ quantite: `Stock disponible: ${updatedArticle.article.stock || 0}` });
      } else {
        setFormErrors({});
      }
    }
    
    // Calculer le total de la ligne
    if (['quantite', 'prixUnitaire', 'remise'].includes(name)) {
      const qte = name === 'quantite' ? numericValue : updatedArticle.quantite;
      const prix = name === 'prixUnitaire' ? numericValue : updatedArticle.prixUnitaire;
      const remise = name === 'remise' ? numericValue : updatedArticle.remise;
      
      const totalHT = qte * prix * (1 - remise / 100);
      const totalTTC = totalHT * (1 + updatedArticle.tva / 100);
      
      updatedArticle.total = totalTTC;
    }
    
    setCurrentArticle(updatedArticle);
  };

  // Valider le formulaire
  const validateForm = () => {
    const errors = {};
    
    if (!currentArticle.article) errors.article = "Veuillez sélectionner un article";
    if (currentArticle.quantite <= 0) errors.quantite = "La quantité doit être supérieure à 0";
    if (currentArticle.prixUnitaire <= 0) errors.prixUnitaire = "Le prix doit être supérieur à 0";
    if (currentArticle.remise < 0 || currentArticle.remise > 100) {
      errors.remise = "La remise doit être entre 0 et 100%";
    }
    
    // Vérifier la disponibilité du stock
    if (currentArticle.article && (currentArticle.article.stock || 0) < currentArticle.quantite) {
      errors.quantite = `Stock insuffisant. Disponible: ${currentArticle.article.stock || 0}`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Ajouter un article à la vente
  const handleAddArticle = () => {
    if (!validateForm()) return;
    
    const newArticleItem = {
      article: currentArticle.article._id,
      articleData: currentArticle.article,
      designation: currentArticle.article.designation,
      reference: currentArticle.article.reference,
      quantite: currentArticle.quantite,
      prixUnitaire: currentArticle.prixUnitaire,
      remise: currentArticle.remise,
      tva: currentArticle.tva,
      totalHT: currentArticle.quantite * currentArticle.prixUnitaire * (1 - currentArticle.remise / 100),
      totalTTC: currentArticle.total
    };
    
    let updatedArticles;
    
    if (editIndex >= 0) {
      // Modification d'un article existant
      updatedArticles = [...venteData.articles];
      updatedArticles[editIndex] = newArticleItem;
    } else {
      // Ajout d'un nouvel article
      updatedArticles = [...(venteData.articles || []), newArticleItem];
    }
    
    updateVenteData({ articles: updatedArticles });
    
    // Réinitialiser le formulaire
    setCurrentArticle({
      article: null,
      quantite: 1,
      prixUnitaire: 0,
      remise: 0,
      tva: 19,
      total: 0
    });
    
    setEditIndex(-1);
    setOpenAddDialog(false);
  };

  // Éditer un article
  const handleEditArticle = (index) => {
    const item = venteData.articles[index];
    
    setCurrentArticle({
      article: item.articleData,
      quantite: item.quantite,
      prixUnitaire: item.prixUnitaire,
      remise: item.remise,
      tva: item.tva,
      total: item.totalTTC
    });
    
    setEditIndex(index);
    setOpenAddDialog(true);
  };

  // Supprimer un article
  const handleDeleteArticle = (index) => {
    const updatedArticles = [...venteData.articles];
    updatedArticles.splice(index, 1);
    updateVenteData({ articles: updatedArticles });
  };

  // Mise à jour de la remise globale
  const handleRemiseGlobaleChange = (e) => {
    const remise = parseFloat(e.target.value) || 0;
    if (remise >= 0 && remise <= 100) {
      updateVenteData({ remise });
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Sélection des articles
      </Typography>

      {/* Tableau des articles ajoutés */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setOpenAddDialog(true)}
          >
            Ajouter un article
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Référence</TableCell>
                <TableCell>Désignation</TableCell>
                <TableCell align="right">Prix</TableCell>
                <TableCell align="right">Qté</TableCell>
                <TableCell align="right">Remise</TableCell>
                <TableCell align="right">TVA</TableCell>
                <TableCell align="right">Total TTC</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {venteData.articles && venteData.articles.length > 0 ? (
                venteData.articles.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.reference || '-'}</TableCell>
                    <TableCell>{item.designation}</TableCell>
                    <TableCell align="right">{item.prixUnitaire.toFixed(2)} TND</TableCell>
                    <TableCell align="right">{item.quantite}</TableCell>
                    <TableCell align="right">{item.remise}%</TableCell>
                    <TableCell align="right">{item.tva}%</TableCell>
                    <TableCell align="right">{item.totalTTC.toFixed(2)} TND</TableCell>
                    <TableCell align="center">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditArticle(index)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteArticle(index)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Aucun article ajouté
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Résumé des calculs */}
      {venteData.articles && venteData.articles.length > 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Remise globale (%)"
              type="number"
              value={venteData.remise || 0}
              onChange={handleRemiseGlobaleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Discount fontSize="small" />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Résumé</strong>
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2">Sous-total:</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="body2">{calculationSummary.sousTotal.toFixed(2)} TND</Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2">Remise:</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="body2" color="error">
                      -{calculationSummary.totalRemise.toFixed(2)} TND
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2">Total HT:</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="body2">{calculationSummary.totalHT.toFixed(2)} TND</Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2">TVA:</Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="body2">{calculationSummary.totalTVA.toFixed(2)} TND</Typography>
                  </Grid>
                  
                  <Divider sx={{ my: 1, width: '100%' }} />
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle1"><strong>Total TTC:</strong></Typography>
                  </Grid>
                  <Grid item xs={6} textAlign="right">
                    <Typography variant="subtitle1" color="primary"><strong>{calculationSummary.totalTTC.toFixed(2)} TND</strong></Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Boîte de dialogue pour l'ajout d'un article */}
      <Dialog 
        open={openAddDialog} 
        onClose={() => {
          setOpenAddDialog(false);
          setEditIndex(-1);
          setCurrentArticle({
            article: null,
            quantite: 1,
            prixUnitaire: 0,
            remise: 0,
            tva: 19,
            total: 0
          });
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editIndex >= 0 ? "Modifier l'article" : "Ajouter un article"}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                options={filteredArticles}
                getOptionLabel={(option) => option.designation}
                value={currentArticle.article}
                onChange={(event, newValue) => handleSelectArticle(newValue)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Article *" 
                    variant="outlined" 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    error={!!formErrors.article}
                    helperText={formErrors.article}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <Search color="action" sx={{ mr: 1 }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body1">{option.designation}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {option.prixVenteHT.toFixed(2)} TND
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Réf: {option.reference || 'N/A'}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color={(option.stock || 0) > 0 ? 'success.main' : 'error.main'}
                        >
                          Stock: {option.stock || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Quantité *"
                name="quantite"
                type="number"
                value={currentArticle.quantite}
                onChange={handleCurrentArticleChange}
                fullWidth
                error={!!formErrors.quantite}
                helperText={formErrors.quantite}
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Prix unitaire *"
                name="prixUnitaire"
                type="number"
                value={currentArticle.prixUnitaire}
                onChange={handleCurrentArticleChange}
                fullWidth
                error={!!formErrors.prixUnitaire}
                helperText={formErrors.prixUnitaire}
                InputProps={{
                  inputProps: { min: 0, step: 0.01 },
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                label="Remise (%)"
                name="remise"
                type="number"
                value={currentArticle.remise}
                onChange={handleCurrentArticleChange}
                fullWidth
                error={!!formErrors.remise}
                helperText={formErrors.remise}
                InputProps={{
                  inputProps: { min: 0, max: 100, step: 0.01 },
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="TVA (%)"
                name="tva"
                type="number"
                value={currentArticle.tva}
                onChange={handleCurrentArticleChange}
                fullWidth
                InputProps={{
                  inputProps: { min: 0, max: 100, step: 0.01 },
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Total TTC"
                value={currentArticle.total.toFixed(2)}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalculateOutlined />
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">TND</InputAdornment>,
                }}
                fullWidth
              />
            </Grid>
            
            {currentArticle.article && (currentArticle.article.stock || 0) < 5 && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  Stock faible : {currentArticle.article.stock || 0} unités disponibles
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenAddDialog(false);
              setEditIndex(-1);
              setCurrentArticle({
                article: null,
                quantite: 1,
                prixUnitaire: 0,
                remise: 0,
                tva: 19,
                total: 0
              });
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleAddArticle} 
            variant="contained" 
            color="primary"
            startIcon={<Add />}
          >
            {editIndex >= 0 ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ArticlesStep;