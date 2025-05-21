// Settings.js (version corrigée)
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Snackbar, Alert, Tabs, Tab, Paper, CircularProgress,
  Button 
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import EntrepriseSettings from '../components/EntrepriseSettings';
import CategorySettings from '../components/CategorySettings';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/apiClient';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Récupérer les informations de l'utilisateur si nécessaire
    const fetchUserData = async () => {
      if (!user) {
        setError("Vous n'êtes pas connecté. Veuillez vous connecter pour accéder aux paramètres.");
        setLoading(false);
        return;
      }

      try {
        console.log('Données utilisateur du contexte:', user);
        
        // Vérifier si nous avons déjà toutes les données nécessaires
        if (user._id && user.entrepriseId) {
          setUserData(user);
          setLoading(false);
          return;
        }

        // Sinon, récupérer les données utilisateur depuis l'API
        const response = await apiClient.get('/api/auth/verify');
        
        if (response.data && response.data.success) {
          const updatedUser = response.data.user;
          
          // Vérifier que nous avons bien reçu les données requises
          if (!updatedUser._id || !updatedUser.entrepriseId) {
            setError("Votre compte n'est pas associé à une entreprise. Veuillez contacter l'administrateur.");
            setLoading(false);
            return;
          }
          
          setUserData(updatedUser);
        } else {
          setError("Impossible de récupérer vos informations. Veuillez vous reconnecter.");
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des informations utilisateur:', error);
        
        // Gestion spécifique selon le code d'erreur
        if (error.response?.status === 401) {
          setError("Votre session a expiré. Veuillez vous reconnecter.");
        } else if (error.response?.status === 404) {
          setError("Utilisateur ou entreprise introuvable. Veuillez contacter l'administrateur.");
        } else {
          setError(`Erreur de communication avec le serveur: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    // Retenter la récupération des données
    apiClient.get('/api/auth/verify')
      .then(response => {
        if (response.data && response.data.success) {
          setUserData(response.data.user);
          setSnackbar({
            open: true,
            message: 'Informations utilisateur actualisées',
            severity: 'success'
          });
        } else {
          throw new Error('Échec de l\'actualisation');
        }
      })
      .catch(err => {
        console.error('Erreur lors de l\'actualisation:', err);
        setError('Impossible de récupérer vos informations. Veuillez vous reconnecter.');
      })
      .finally(() => {
        setLoading(false);
      });
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Afficher l'écran d'erreur avec des options
  if (error || !userData || !userData._id || !userData.entrepriseId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Paramètres
        </Typography>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || "Impossible d'accéder aux paramètres. Veuillez vous reconnecter ou contacter l'administrateur."}
        </Alert>
        
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Actualiser
          </Button>
          
          <Button 
            variant="outlined"
            onClick={handleLogout}
          >
            Se déconnecter
          </Button>
        </Box>
        
        {userData && (
          <Paper sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle1">Informations utilisateur détectées:</Typography>
            <Box component="pre" sx={{ mt: 1, p: 1, bgcolor: '#eaeaea', borderRadius: 1, overflow: 'auto' }}>
              {JSON.stringify({
                userId: userData._id || "Non défini",
                entrepriseId: userData.entrepriseId || "Non défini",
                email: userData.email || "Non défini"
              }, null, 2)}
            </Box>
          </Paper>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Paramètres
      </Typography>

      <Tabs 
        value={activeTab} 
        onChange={handleTabChange}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Entreprise" />
        <Tab label="Catégories de dépenses" />
      </Tabs>

      <Paper sx={{ p: 3, mt: 2 }}>
        {activeTab === 0 ? (
          <EntrepriseSettings 
            userId={userData._id}
            entrepriseId={userData.entrepriseId}
            onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
            onSuccess={(message) => setSnackbar({ open: true, message, severity: 'success' })}
          />
        ) : (
          <CategorySettings 
            userId={userData._id}
            entrepriseId={userData.entrepriseId}
            onError={(message) => setSnackbar({ open: true, message, severity: 'error' })}
            onSuccess={(message) => setSnackbar({ open: true, message, severity: 'success' })}
          />
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert 
          onClose={handleSnackbarClose}
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}