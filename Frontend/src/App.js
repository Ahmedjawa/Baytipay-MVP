// client/src/App.js - Point d'entrée de l'application React

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import axios from "axios";
import config from "./config";
import apiClient from './utils/apiClient';
import { useAuth } from './context/AuthContext';


// Contexte d'authentification
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Composants principaux
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TiersPage from './pages/Tiers'; // Nouvelle page unifiée pour les tiers
import DossiersPage from './pages/Dossiers';
import DossierDetailsPage from './pages/DossierDetails';
import TransactionsPage from './pages/Transactions';
import CaissePage from './pages/Caisse';
import ChatbotPage from './pages/Chatbot';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register'; 
import VentePage from './pages/Vente';
import ArticlesPage from './pages/Articles';
import VentesList from './pages/VentesList';
import AchatPage from './pages/AchatPage';
import DepensePage from './pages/DepensePage';

// Thème personnalisé
const theme = createTheme({
  palette: {
    primary: {
      main: '#40E0D0', // Turquoise Baytipay
      contrastText: '#fff',
    },
    secondary: {
      main: '#003366', // Bleu foncé
    },
    error: {
      main: '#FF6B6B', // Rouge notifications
    },
  },
  typography: {
    fontFamily: '"Montserrat", sans-serif',
    h4: {
      fontWeight: 700,
      color: '#003366'
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          padding: '10px 20px'
        },
      },
    },
  },
});

// Configuration RTL pour support arabe
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

function App() {
  // État pour gérer la direction du texte (LTR/RTL)
  const [direction, setDirection] = React.useState('ltr');
  
  const [data, setData] = useState([]);

  useEffect(() => {
    // Appel API vers le backend
    apiClient.get('/api/settings')
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des données :", error);
      });
  }, []);
  
  // Mise à jour du thème quand la direction change
  const themeWithDirection = React.useMemo(
    () => createTheme({
      ...theme,
      direction: direction,
    }),
    [direction]
  );
  
  return (
    <Router>
      <AuthProvider>
        {direction === 'rtl' ? (
          <CacheProvider value={cacheRtl}>
            <ThemeProvider theme={themeWithDirection}>
              <CssBaseline />
              <AppRoutes setDirection={setDirection} />
            </ThemeProvider>
          </CacheProvider>
        ) : (
          <ThemeProvider theme={themeWithDirection}>
            <CssBaseline />
            <AppRoutes setDirection={setDirection} />
          </ThemeProvider>
        )}
      </AuthProvider>
    </Router>
  );
}

// Définition des routes
function AppRoutes({ setDirection }) {
  const { isAuthenticated } = useAuth(); // Ajouter cette ligne

  return (
    <Routes>
      <Route 
        path="/" 
        element={!isAuthenticated ? <Navigate to="/login" /> : <Navigate to="/dashboard" />} 
      />
      {/* Route publique pour la connexion */}
      <Route path="/login" element={<Login />} />
	  <Route path="/register" element={<Register />} />
	  
      
      {/* Routes protégées nécessitant une authentification */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout setDirection={setDirection} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tiers" element={<TiersPage />} />
		  <Route path="/articles" element={<ArticlesPage />} />
		  <Route path="/depense" element={<DepensePage />} />
		  <Route path="/achat" element={<AchatPage />} />
		  <Route path="/vente" element={<VentePage />} />
		  <Route path="/ventes" element={<VentesList />} />
          <Route path="/dossiers" element={<DossiersPage />} />
          <Route path="/dossiers/:id" element={<DossierDetailsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/caisse" element={<CaissePage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;