// client/src/App.js - Point d'entrée de l'application React

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import { Box, CircularProgress } from '@mui/material';

// Contexte d'authentification
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Composants principaux
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TiersPage from './pages/Tiers';
import TransactionsPage from './pages/Transactions';
import CaissePage from './pages/CaissePage';
import ChatbotPage from './pages/Chatbot';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Register from './pages/Register'; 
import VentePage from './pages/Vente';
import ArticlesPage from './pages/Articles';
import VentesList from './pages/VentesList';
import AchatPage from './pages/AchatPage';
import AchatsList from './pages/AchatsList';
import DepensePage from './pages/DepensePage';
import ScanPage from './pages/ScanPage';
import VenteDetails from './pages/VenteDetails';

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

// Composant de routes
const AppRoutes = ({ setDirection }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={!user ? <Navigate to="/login" /> : <Navigate to="/dashboard" />} 
      />
      {/* Route publique pour la connexion */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      
      {/* Routes protégées nécessitant une authentification */}
      <Route element={<Layout setDirection={setDirection} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tiers" element={<TiersPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/depense" element={<DepensePage />} />
        <Route path="/achat" element={<AchatPage />} />
        <Route path="/achats" element={<AchatsList />} />
        <Route path="/vente" element={<VentePage />} />
        <Route path="/ventes" element={<VentesList />} />
        <Route path="/ventes/:id" element={<VenteDetails />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/caisse" element={<CaissePage />} />
        <Route path="/scan" element={<ScanPage />} /> 
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

// Composant principal
const App = () => {
  const [direction, setDirection] = useState('ltr');
  
  const themeWithDirection = React.useMemo(
    () => createTheme({
      ...theme,
      direction: direction,
    }),
    [direction]
  );
  
  return (
    <AuthProvider>
      <ThemeProvider theme={themeWithDirection}>
        <CssBaseline />
        <Router>
          <AppRoutes setDirection={setDirection} />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;