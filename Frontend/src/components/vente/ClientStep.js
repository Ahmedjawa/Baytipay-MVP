// client/src/components/vente/ClientStep.js - Étape 1: Sélection du client
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Autocomplete, Button, Grid, Paper,
  Chip, Avatar, Card, CardContent, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Divider, MenuItem
} from '@mui/material';
import { Add, Person, Store, Business, CheckCircle, Cancel, Pending, Search } from '@mui/icons-material';
import apiClient from '../../utils/apiClient';
import config from '../../config';

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

function ClientStep({ venteData, updateVenteData }) {
  // État du composant
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newClientData, setNewClientData] = useState({
    type: 'CLIENT',
    nom: '',
    adresse: '',
    telephone: '',
    email: '',
    matriculeFiscal: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Récupérer la liste des clients au chargement
  useEffect(() => {
    fetchClients();
  }, []);

  // Récupérer les clients depuis l'API
  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${config.backendURL}/tiers?type=CLIENT`);
      setClients(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des clients:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les clients en fonction de la recherche
  const filteredClients = clients.filter(client =>
    client.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.matriculeFiscal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sélectionner un client
  const handleSelectClient = (client) => {
    updateVenteData({ client });
  };

  // Gérer les changements dans le formulaire d'ajout de client
  const handleNewClientChange = (e) => {
    const { name, value } = e.target;
    setNewClientData(prev => ({ ...prev, [name]: value }));
    
    // Effacer l'erreur lorsque l'utilisateur modifie le champ
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Valider le formulaire d'ajout de client
  const validateForm = () => {
    const errors = {};
    
    if (!newClientData.nom.trim()) errors.nom = "Le nom est obligatoire";
    if (!newClientData.adresse.trim()) errors.adresse = "L'adresse est obligatoire";
    
    if (newClientData.telephone && !/^[0-9]{8}$/.test(newClientData.telephone)) {
      errors.telephone = "Le numéro doit contenir 8 chiffres";
    }
    
    if (newClientData.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(newClientData.email)) {
      errors.email = "Format d'email invalide";
    }
    
    if (!newClientData.matriculeFiscal) {
      errors.matriculeFiscal = "Matricule fiscal obligatoire";
    } else if (!/^[0-9]{7}[A-Za-z]{3}$/.test(newClientData.matriculeFiscal)) {
      errors.matriculeFiscal = "Format invalide (7 chiffres + 3 lettres)";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Ajouter un nouveau client
  const handleAddNewClient = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const response = await apiClient.post(`${config.backendURL}/tiers`, newClientData);
      
      // Mettre à jour la liste des clients
      await fetchClients();
      
      // Sélectionner automatiquement le nouveau client
      handleSelectClient(response.data);
      
      // Fermer la boîte de dialogue
      setOpenAddDialog(false);
      
      // Réinitialiser le formulaire
      setNewClientData({
        type: 'CLIENT',
        nom: '',
        adresse: '',
        telephone: '',
        email: '',
        matriculeFiscal: ''
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du client:", error);
      
      // Gestion des erreurs de validation du backend
      if (error.response?.data?.errors) {
        const backendErrors = {};
        Object.entries(error.response.data.errors).forEach(([field, message]) => {
          backendErrors[field] = message;
        });
        setFormErrors(backendErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Sélection du client
      </Typography>

      <Grid container spacing={3}>
        {/* Barre de recherche et bouton d'ajout */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Autocomplete
              fullWidth
              options={filteredClients}
              getOptionLabel={(option) => option.nom}
              value={venteData.client}
              onChange={(event, newValue) => handleSelectClient(newValue)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Rechercher un client" 
                  variant="outlined" 
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getTiersTypeIcon(option.type)}
                        <Typography variant="body1">{option.nom}</Typography>
                      </Box>
                      <Chip 
                        size="small"
                        label={option.matriculeFiscal || 'Sans MF'}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {option.adresse}
                    </Typography>
                  </Box>
                </li>
              )}
            />
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={() => setOpenAddDialog(true)}
            >
              Nouveau client
            </Button>
          </Box>
        </Grid>

        {/* Affichage des détails du client sélectionné */}
        {venteData.client && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getTiersTypeIcon(venteData.client.type)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{venteData.client.nom}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            icon={getStatusChip(venteData.client.actif, venteData.client.soldeCourant).icon}
                            label={getStatusChip(venteData.client.actif, venteData.client.soldeCourant).label}
                            color={getStatusChip(venteData.client.actif, venteData.client.soldeCourant).color}
                            size="small"
                          />
                          <Typography variant="body2">
                            MF: {venteData.client.matriculeFiscal || 'Non spécifié'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Typography variant="body2" gutterBottom>
                      <strong>Adresse:</strong> {venteData.client.adresse}
                    </Typography>
                    {venteData.client.telephone && (
                      <Typography variant="body2" gutterBottom>
                        <strong>Téléphone:</strong> {venteData.client.telephone}
                      </Typography>
                    )}
                    {venteData.client.email && (
                      <Typography variant="body2" gutterBottom>
                        <strong>Email:</strong> {venteData.client.email}
                      </Typography>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'background.default',
                        border: '1px solid',
                        borderColor: (venteData.client.soldeCourant || 0) < 0 ? 'error.light' : 'success.light'
                      }}
                    >
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        État du compte
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                        <Typography>Solde actuel:</Typography>
                        <Typography 
                          fontWeight="bold" 
                          color={(venteData.client.soldeCourant || 0) < 0 ? 'error.main' : 'success.main'}
                        >
                          {(venteData.client.soldeCourant || 0).toFixed(2)} TND
                        </Typography>
                      </Box>
                      
                      {(venteData.client.soldeCourant || 0) < 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          Ce client a un solde négatif. Vérifiez les paiements en attente.
                        </Alert>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Boîte de dialogue pour ajouter un nouveau client */}
      <Dialog 
        open={openAddDialog} 
        onClose={() => setOpenAddDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Ajouter un nouveau client</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField 
                label="Nom *" 
                name="nom" 
                value={newClientData.nom} 
                onChange={handleNewClientChange} 
                fullWidth
                error={!!formErrors.nom}
                helperText={formErrors.nom}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Adresse *" 
                name="adresse" 
                value={newClientData.adresse} 
                onChange={handleNewClientChange} 
                fullWidth
                multiline
                rows={2}
                error={!!formErrors.adresse}
                helperText={formErrors.adresse}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Téléphone" 
                name="telephone" 
                value={newClientData.telephone} 
                onChange={handleNewClientChange} 
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
                value={newClientData.email} 
                onChange={handleNewClientChange} 
                fullWidth
                error={!!formErrors.email}
                helperText={formErrors.email}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Matricule Fiscal *" 
                name="matriculeFiscal" 
                value={newClientData.matriculeFiscal} 
                onChange={handleNewClientChange} 
                fullWidth
                error={!!formErrors.matriculeFiscal}
                helperText={formErrors.matriculeFiscal}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Annuler</Button>
          <Button 
            onClick={handleAddNewClient} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ClientStep;