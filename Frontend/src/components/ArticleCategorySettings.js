import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Paper,
  CircularProgress
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import apiClient from '../utils/apiClient';

export default function ArticleCategorySettings({ userId, entrepriseId, onSuccess, onError }) {
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({ nom: '', description: '' });
  const [loading, setLoading] = useState(true);

  // Charger les catégories
  const loadCategories = async () => {
    if (!entrepriseId) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.get('/api/parametres/categories-articles');
      setCategories(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      onError('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [entrepriseId]);

  // Gestion de la boîte de dialogue
  const handleOpenDialog = (category = null) => {
    setSelectedCategory(category);
    if (category) {
      setFormData({
        nom: category.nom,
        description: category.description || ''
      });
    } else {
      setFormData({ nom: '', description: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCategory(null);
    setFormData({ nom: '', description: '' });
  };

  // Gestion des changements de formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Sauvegarde d'une catégorie
  const handleSave = async () => {
    if (!userId || !entrepriseId) {
      onError('Utilisateur ou entreprise non identifié');
      return;
    }

    if (!formData.nom.trim()) {
      onError('Le nom de la catégorie est requis');
      return;
    }

    try {
      const categoryData = {
        nom: formData.nom,
        description: formData.description
      };

      if (selectedCategory) {
        await apiClient.put(`/api/parametres/categories-articles/${selectedCategory._id}`, categoryData);
        onSuccess('Catégorie modifiée avec succès');
      } else {
        await apiClient.post('/api/parametres/categories-articles', categoryData);
        onSuccess('Catégorie ajoutée avec succès');
      }
      handleCloseDialog();
      loadCategories();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      onError(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    }
  };

  // Suppression d'une catégorie
  const handleDelete = async (id) => {
    if (window.confirm('Voulez-vous vraiment désactiver cette catégorie ?')) {
      try {
        await apiClient.delete(`/api/parametres/categories-articles/${id}`);
        onSuccess('Catégorie désactivée avec succès');
        loadCategories();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        onError('Erreur lors de la désactivation');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Catégories d'articles</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Ajouter une catégorie
        </Button>
      </Box>

      {categories.length === 0 ? (
        <Alert severity="info">
          Aucune catégorie d'article n'est définie. Créez votre première catégorie.
        </Alert>
      ) : (
        <List>
          {categories.map((category) => (
            <ListItem
              key={category._id}
              sx={{
                mb: 1,
                bgcolor: 'background.paper',
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <ListItemText
                primary={category.nom}
                secondary={category.description || 'Aucune description'}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => handleOpenDialog(category)}
                  sx={{ mr: 1 }}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDelete(category._id)}
                >
                  <Delete />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Boîte de dialogue pour ajouter/modifier une catégorie */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom de la catégorie"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            {selectedCategory ? 'Modifier' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 