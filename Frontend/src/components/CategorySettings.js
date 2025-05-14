// components/CategorySettings.js
import React, { useState, useEffect } from 'react';
import { 
  Box, TextField, Button, List, ListItem, Typography,
  ListItemText, IconButton, CircularProgress, Grid,
  FormControl, InputLabel, Select, MenuItem, Divider,
  Paper, Alert
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import apiClient from '../utils/apiClient';

export default function CategorySettings({ userId, entrepriseId, onSuccess, onError }) {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    nom: '',
    type: 'DEPENSE', // Valeur par défaut pour les catégories de dépenses
    description: '',
    parent: ''
  });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  
  // Liste de parents prédéfinis selon le modèle
  const predefinedParents = [
    { value: 'SALAIRE', label: 'Salaire' },
    { value: 'LOYER', label: 'Loyer' },
    { value: 'AUTRE CHARGE', label: 'Autre charge' }
  ];

  useEffect(() => {
    const loadCategories = async () => {
      if (!entrepriseId) {
        setLoading(false);
        return;
      }
      
      try {
        // Charger les catégories de type DEPENSE
        const response = await apiClient.get('/api/categories/type/DEPENSE');
        setCategories(response.data.data || []);
      } catch (error) {
        onError(error.response?.data?.message || 'Erreur de chargement des catégories');
      } finally {
        setLoading(false);
      }
    };
    
    loadCategories();
  }, [entrepriseId]);

  const resetForm = () => {
    setNewCategory({
      nom: '',
      type: 'DEPENSE',
      description: '',
      parent: ''
    });
    setEditMode(false);
    setCurrentCategoryId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewCategory(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userId || !entrepriseId) {
      onError('Utilisateur ou entreprise non identifié');
      return;
    }

    if (!newCategory.nom.trim()) {
      onError('Le nom de la catégorie est requis');
      return;
    }

    try {
      let response;
      
      // Assurer que les données envoyées ont le type DEPENSE et l'entrepriseId
      const categoryData = {
        ...newCategory,
        type: 'DEPENSE',
        entrepriseId: entrepriseId
      };
      
      console.log('Envoi des données de catégorie:', categoryData);
      
      if (editMode && currentCategoryId) {
        // Mode édition
        response = await apiClient.put(`/api/categories/${currentCategoryId}`, categoryData);
        if (response.data.success) {
          setCategories(categories.map(cat => 
            cat._id === currentCategoryId ? response.data.data : cat
          ));
          onSuccess('Catégorie mise à jour avec succès');
          resetForm();
        } else {
          onError(response.data.message || 'Erreur lors de la mise à jour');
        }
      } else {
        // Mode création
        response = await apiClient.post('/api/categories', categoryData);
        if (response.data.success) {
          setCategories([...categories, response.data.data]);
          onSuccess('Catégorie ajoutée avec succès');
          resetForm();
        } else {
          onError(response.data.message || 'Erreur lors de la création');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la gestion des catégories:', error);
      onError(error.response?.data?.message || 'Erreur lors de l\'opération');
    }
  };

  const handleEdit = (category) => {
    setNewCategory({
      nom: category.nom,
      type: category.type || 'DEPENSE',
      description: category.description || '',
      parent: category.parent || ''
    });
    setEditMode(true);
    setCurrentCategoryId(category._id);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/api/categories/${id}`);
      setCategories(categories.filter(c => c._id !== id));
      onSuccess('Catégorie supprimée');
      resetForm(); // Reset le formulaire si on était en train d'éditer
    } catch (error) {
      onError(error.response?.data?.message || 'Erreur de suppression');
    }
  };

  // Obtenir le libellé à partir de la valeur parent
  const getParentLabel = (parentValue) => {
    const parent = predefinedParents.find(p => p.value === parentValue);
    return parent ? parent.label : parentValue;
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
      <Typography variant="h6" gutterBottom>
        {editMode ? "Modifier la catégorie" : "Ajouter une nouvelle catégorie de dépense"}
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nom de la catégorie"
                name="nom"
                value={newCategory.nom}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Catégorie parente</InputLabel>
                <Select
                  name="parent"
                  value={newCategory.parent}
                  onChange={handleChange}
                  label="Catégorie parente"
                >
                  <MenuItem value="">Aucune (Catégorie principale)</MenuItem>
                  {predefinedParents.map(parent => (
                    <MenuItem 
                      key={parent.value} 
                      value={parent.value}
                    >
                      {parent.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={newCategory.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              {editMode && (
                <Button 
                  type="button" 
                  variant="outlined"
                  onClick={resetForm}
                >
                  Annuler
                </Button>
              )}
              <Button 
                type="submit" 
                variant="contained" 
                startIcon={editMode ? <Edit /> : <Add />}
              >
                {editMode ? "Mettre à jour" : "Ajouter"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Liste des catégories de dépenses
      </Typography>
      
      {categories.length === 0 ? (
        <Alert severity="info">
          Aucune catégorie de dépense n'est définie. Créez votre première catégorie.
        </Alert>
      ) : (
        <List sx={{ width: '100%' }}>
          {categories.map(category => (
            <ListItem
              key={category._id}
              secondaryAction={
                <Box>
                  <IconButton onClick={() => handleEdit(category)} sx={{ mr: 1 }}>
                    <Edit />
                  </IconButton>
                  <IconButton 
                    onClick={() => handleDelete(category._id)}
                    disabled={category.estSysteme} // Désactiver pour les catégories système
                  >
                    <Delete />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText 
                primary={category.nom} 
                secondary={
                  <>
                    {category.parent && `Parent: ${getParentLabel(category.parent)}`}
                    {category.description && (category.parent ? ' | ' : '') + category.description}
                    {category.estSysteme && <Typography component="span" sx={{ ml: 1, color: 'text.secondary', fontStyle: 'italic' }}>(Système)</Typography>}
                  </>
                } 
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}