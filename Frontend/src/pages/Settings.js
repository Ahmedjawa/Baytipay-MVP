import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, TextField, Button, Snackbar, Alert, 
  FormControl, InputLabel, Select, MenuItem, Grid, Paper, 
  Divider, CircularProgress, Avatar, IconButton, Chip // Chip ajouté ici
} from '@mui/material';
import { 
  Save, Business, Edit, Email, Phone, LocationOn, 
  VerifiedUser, CorporateFare, CloudUpload, CheckCircleOutline, ErrorOutline // Icônes ajoutées
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';

export default function Settings() {
  const { user } = useAuth();
  const [entreprise, setEntreprise] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    formeJuridique: 'SARL',
    numeroFiscal: '',
    adresse: '',
    telephone: '',
    email: '',
    logoUrl: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  const [loading, setLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
  const fetchEntreprise = async () => {
    try {
      const response = await apiClient.get('/api/settings');
      setEntreprise(response.data);
      setFormData(response.data || { // Gérer le cas null
        nom: '',
        formeJuridique: 'SARL',
        numeroFiscal: '',
        adresse: '',
        telephone: '',
        email: '',
        logoUrl: ''
      });
    } catch (error) {
      // Initialiser même en cas d'erreur
      setFormData({ 
        nom: '',
        formeJuridique: 'SARL',
        numeroFiscal: '',
        adresse: '',
        telephone: '',
        email: '',
        logoUrl: ''
      });
    } finally {
      setLoading(false);
    }
  };
  fetchEntreprise();
}, [user]);

  const validateForm = () => {
    const errors = {};
    const requiredFields = ['nom', 'formeJuridique', 'numeroFiscal', 'adresse', 'telephone', 'email'];
    
    requiredFields.forEach(field => {
      if (!formData[field]?.trim()) {
        errors[field] = "Ce champ est obligatoire";
      }
    });

    if (!/^[0-9]{8}$/.test(formData.telephone)) {
      errors.telephone = "Numéro invalide (8 chiffres)";
    }

    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      errors.email = "Format d'email invalide";
    }

    if (!/^[0-9A-Z]{8,15}$/.test(formData.numeroFiscal)) {
      errors.numeroFiscal = "Format invalide (8-15 caractères alphanumériques)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  try {
    const method = entreprise ? 'put' : 'post';
    const response = await apiClient[method]('/api/settings', formData);
    
    setEntreprise(response.data);
    setSnackbar({
      open: true,
      message: entreprise 
        ? "Entreprise mise à jour avec succès" 
        : "Entreprise créée avec succès",
      severity: "success"
    });

  } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setSnackbar({ 
        open: true, 
        message: error.response?.data?.message || "Erreur lors de l'enregistrement", 
        severity: "error" 
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await apiClient.post(
        `/api/settings/${user.entrepriseId}/logo`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setFormData(prev => ({ ...prev, logoUrl: response.data.logoUrl }));
      setLogoPreview(URL.createObjectURL(file));
      setSnackbar({
        open: true,
        message: "Logo mis à jour avec succès",
        severity: "success"
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Échec de l'upload du logo",
        severity: "error"
      });
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
    <Box sx={{ p: 4, maxWidth: 1000, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        color: 'primary.main'
      }}>
        <Business fontSize="large" /> 
        Paramètres de l'entreprise
        <Chip 
          label="Configurations"
          color="primary"
          variant="outlined"
          size="small"
        />
      </Typography>

      <Paper sx={{ p: 3, mb: 3, position: 'relative' }}>
        <Box sx={{ 
          position: 'absolute', 
          right: 20, 
          top: 20, 
          display: 'flex', 
          alignItems: 'center',
          gap: 2
        }}>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="logo-upload"
            type="file"
            onChange={handleLogoUpload}
          />
          <label htmlFor="logo-upload">
            <IconButton component="span">
              <CloudUpload fontSize="large" color="action" />
            </IconButton>
          </label>
          <Avatar 
            src={logoPreview}
            sx={{ 
              width: 100, 
              height: 100, 
              border: '2px solid',
              borderColor: 'primary.main'
            }}
          >
            <Business sx={{ fontSize: 40 }} />
          </Avatar>
        </Box>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nom de l'entreprise"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                error={!!formErrors.nom}
                helperText={formErrors.nom}
                InputProps={{
                  startAdornment: <CorporateFare sx={{ color: 'action.active', mr: 1 }} />
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Forme juridique</InputLabel>
                <Select
                  name="formeJuridique"
                  value={formData.formeJuridique}
                  onChange={handleChange}
                  label="Forme juridique"
                  error={!!formErrors.formeJuridique}
                >
                  {['SARL', 'SA', 'SAS', 'EI', 'EURL', 'Autre'].map(option => (
                    <MenuItem key={option} value={option}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VerifiedUser fontSize="small" />
                        {option}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Numéro fiscal"
                name="numeroFiscal"
                value={formData.numeroFiscal}
                onChange={handleChange}
                error={!!formErrors.numeroFiscal}
                helperText={formErrors.numeroFiscal}
                InputProps={{
                  startAdornment: <VerifiedUser sx={{ color: 'action.active', mr: 1 }} />
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Téléphone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                error={!!formErrors.telephone}
                helperText={formErrors.telephone}
                InputProps={{
                  startAdornment: <Phone sx={{ color: 'action.active', mr: 1 }} />
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adresse"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                multiline
                rows={2}
                error={!!formErrors.adresse}
                helperText={formErrors.adresse}
                InputProps={{
                  startAdornment: <LocationOn sx={{ color: 'action.active', mr: 1 }} />
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!formErrors.email}
                helperText={formErrors.email}
                InputProps={{
                  startAdornment: <Email sx={{ color: 'action.active', mr: 1 }} />
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 2,
                '& button': { textTransform: 'none' }
              }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  sx={{ 
                    minWidth: 120,
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                  Sauvegarder
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          sx={{ width: '100%', boxShadow: 3 }}
          iconMapping={{
            success: <CheckCircleOutline fontSize="inherit" />,
            error: <ErrorOutline fontSize="inherit" />
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}