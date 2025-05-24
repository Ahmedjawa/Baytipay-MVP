// client/src/App.js - Point d'entrée de l'application React

import React, { useState } from "react";
import { Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import { Box, CircularProgress } from '@mui/material';
import { 
  createBrowserRouter, 
  RouterProvider,
  createRoutesFromElements,
  Route as RouterRoute
} from 'react-router-dom';

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

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <RouterRoute 
        path="/" 
        element={!user ? <Navigate to="/login" /> : <Navigate to="/dashboard" />} 
      />
      {/* Route publique pour la connexion */}
        <RouterRoute path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <RouterRoute path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      
      {/* Routes protégées nécessitant une authentification */}
        <RouterRoute element={<Layout setDirection={setDirection} />}>
          <RouterRoute path="/dashboard" element={<Dashboard />} />
          <RouterRoute path="/tiers" element={<TiersPage />} />
          <RouterRoute path="/articles" element={<ArticlesPage />} />
          <RouterRoute path="/depense" element={<DepensePage />} />
          <RouterRoute path="/achat" element={<AchatPage />} />
          <RouterRoute path="/achats" element={<AchatsList />} />
          <RouterRoute path="/vente" element={<VentePage />} />
          <RouterRoute path="/ventes" element={<VentesList />} />
          <RouterRoute path="/ventes/:id" element={<VenteDetails />} />
          <RouterRoute path="/transactions" element={<TransactionsPage />} />
          <RouterRoute path="/caisse" element={<CaissePage />} />
          <RouterRoute path="/scan" element={<ScanPage />} /> 
          <RouterRoute path="/chatbot" element={<ChatbotPage />} />
          <RouterRoute path="/settings" element={<Settings />} />
          <RouterRoute path="*" element={<NotFound />} />
        </RouterRoute>
      </>
    ),
    {
      future: {
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }
    }
  );

  return <RouterProvider router={router} />;
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
          <AppRoutes setDirection={setDirection} />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;