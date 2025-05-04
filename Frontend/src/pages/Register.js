// client/src/pages/Register.js amélioré
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Container,
  Alert,
  CircularProgress,
  Snackbar,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { register } from '../auth';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nom: '',
    prenom: ''
  });
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const navigate = useNavigate();
  const { setIsAuthenticated } = useAuth();

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }
    
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    
    if (!formData.nom) {
      newErrors.nom = 'Le nom est requis';
    }
    
    if (!formData.prenom) {
      newErrors.prenom = 'Le prénom est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setErrorMessage('');
    setLoading(true);
    
    try {
      console.log("Envoi des données d'inscription:", formData);
      const response = await register(formData);
      
      if (response.success) {
        setShowSnackbar(true);
        setIsAuthenticated(true);
        
        // Redirection après un court délai pour permettre à l'utilisateur de voir le message de succès
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setErrorMessage(response.message || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      console.error("Erreur complète:", err);
      setErrorMessage(err.message || 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Card sx={{ width: '100%', boxShadow: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography component="h1" variant="h4" sx={{ mb: 3, color: 'primary.main' }}>
              Créer un compte
            </Typography>
            
            {errorMessage && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {errorMessage}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                name="nom"
                label="Nom"
                value={formData.nom}
                onChange={handleChange}
                disabled={loading}
                error={Boolean(errors.nom)}
                helperText={errors.nom}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="prenom"
                label="Prénom"
                value={formData.prenom}
                onChange={handleChange}
                disabled={loading}
                error={Boolean(errors.prenom)}
                helperText={errors.prenom}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="email"
                label="Adresse email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                error={Boolean(errors.email)}
                helperText={errors.email}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Mot de passe"
                type="password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                error={Boolean(errors.password)}
                helperText={errors.password || 'Minimum 8 caractères'}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'S\'inscrire'}
              </Button>

              <Typography variant="body2" align="center">
                Déjà un compte?{' '}
                <Link to="/login" style={{ color: '#40E0D0' }}>
                  Se connecter
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      
      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowSnackbar(false)}
        message="Compte créé avec succès!"
        action={
          <IconButton size="small" color="inherit" onClick={() => setShowSnackbar(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Container>
  );
};

export default Register;