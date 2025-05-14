// components/EntrepriseSettings.js
import React, { useState, useEffect } from 'react';
import { 
  TextField, Button, Grid, FormControl, InputLabel, 
  Select, MenuItem, CircularProgress, Typography, Box,
  Avatar, IconButton, Alert
} from '@mui/material';
import { Save, Upload, BusinessCenter } from '@mui/icons-material';
import apiClient from '../utils/apiClient';

export default function EntrepriseSettings({ userId, entrepriseId, onSuccess, onError }) {
  const [formData, setFormData] = useState({
    nom: '',
    formeJuridique: 'SARL',
    numeroFiscal: '',
    adresse: '',
    telephone: '',
    email: '',
    logoUrl: '',
    entrepriseId: entrepriseId || '' // Ajout de l'entrepriseId dès le début
  });
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState(null);
  const [settingsId, setSettingsId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      // Vérifier si nous avons les données nécessaires
      if (!userId || !entrepriseId) {
        console.warn('EntrepriseSettings: userId ou entrepriseId manquant');
        setLoading(false);
        return;
      }
      
      try {
        console.log('Chargement des paramètres pour entrepriseId:', entrepriseId);
        const response = await apiClient.get(`/api/settings`);
        
        if (response.data && response.data.success) {
          console.log('Paramètres récupérés:', response.data.data);
          const settings = response.data.data;
          setFormData({
            ...settings,
            entrepriseId: entrepriseId // S'assurer que l'entrepriseId est toujours présent
          });
          setSettingsId(settings._id || null);
        } else {
          console.log('Pas de paramètres existants, création d\'un nouveau');
          // Initialiser avec l'entrepriseId
          setFormData(prev => ({
            ...prev,
            entrepriseId: entrepriseId
          }));
        }
      } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        if (error.response?.status !== 404) { // Ignore 404 car l'entreprise peut ne pas encore être configurée
          onError(error.response?.data?.message || 'Erreur de chargement des données');
        } else {
          // En cas de 404, initialiser avec l'entrepriseId
          setFormData(prev => ({
            ...prev,
            entrepriseId: entrepriseId
          }));
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [userId, entrepriseId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Vérifier les données nécessaires
    if (!userId || !entrepriseId) {
      onError('Informations utilisateur manquantes. Veuillez vous reconnecter.');
      return;
    }
    
    try {
      console.log('Envoi des données entreprise:', {
        ...formData,
        entrepriseId: entrepriseId // S'assurer que l'entrepriseId est présent
      });
      
      // Sauvegarde des informations de l'entreprise
      const response = await apiClient.post('/api/settings', {
        ...formData,
        entrepriseId: entrepriseId // S'assurer que l'entrepriseId est présent
      });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Erreur lors de la sauvegarde');
      }
      
      console.log('Réponse enregistrement:', response.data);
      
      // Récupérer l'ID des paramètres pour l'upload du logo
      const settings = response.data.data;
      const settingsId = settings._id;
      
      // Upload du logo si un fichier est sélectionné et que nous avons un ID
      if (logo && settingsId) {
        const formDataLogo = new FormData();
        formDataLogo.append('logo', logo);
        
        const logoResponse = await apiClient.post(`/api/settings/${settingsId}/logo`, formDataLogo, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (logoResponse.data && logoResponse.data.success) {
          // Mettre à jour les données du formulaire avec le nouveau logo
          setFormData(prev => ({
            ...prev,
            logoUrl: logoResponse.data.data.logoUrl
          }));
        }
      }
      
      onSuccess('Informations de l\'entreprise enregistrées avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des paramètres:', error);
      onError(error.response?.data?.message || error.message || 'Erreur de sauvegarde');
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
      <Typography variant="h6" gutterBottom>
        Informations de l'entreprise
      </Typography>
      
      {(!userId || !entrepriseId) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Certaines informations utilisateur sont manquantes. L'enregistrement pourrait échouer.
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} display="flex" alignItems="center" gap={2}>
            <Avatar 
              src={formData.logoUrl} 
              sx={{ width: 80, height: 80 }}
              variant="rounded"
            >
              <BusinessCenter fontSize="large" />
            </Avatar>
            
            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload />}
            >
              Choisir un logo
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleLogoChange}
              />
            </Button>
            
            {logo && (
              <Typography variant="body2" color="text.secondary">
                {logo.name}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nom de l'entreprise"
              name="nom"
              value={formData.nom}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Forme juridique</InputLabel>
              <Select
                name="formeJuridique"
                value={formData.formeJuridique}
                onChange={handleChange}
                label="Forme juridique"
              >
                <MenuItem value="EI">Entreprise Individuelle</MenuItem>
                <MenuItem value="EURL">EURL</MenuItem>
                <MenuItem value="SARL">SARL</MenuItem>
                <MenuItem value="SAS">SAS</MenuItem>
                <MenuItem value="SASU">SASU</MenuItem>
                <MenuItem value="SA">SA</MenuItem>
                <MenuItem value="SNC">SNC</MenuItem>
                <MenuItem value="Autre">Autre</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Numéro fiscal"
              name="numeroFiscal"
              value={formData.numeroFiscal}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Téléphone"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Adresse"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
        
        <Button 
          type="submit" 
          variant="contained" 
          sx={{ mt: 3 }}
          startIcon={<Save />}
        >
          Enregistrer
        </Button>
      </form>
    </Box>
  );
}