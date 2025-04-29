// client/src/App.js - Point d'entrée de l'application React

//import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { frFR } from '@mui/material/locale';
import rtlPlugin from 'stylis-plugin-rtl';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "./config";

// Composants principaux
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/Clients';
import FournisseursPage from './pages/Fournisseurs';
import DossiersPage from './pages/Dossiers';
import DossierDetailsPage from './pages/DossierDetails';
import TransactionsPage from './pages/Transactions';
import CaissePage from './pages/Caisse';
import ChatbotPage from './pages/Chatbot';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

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
        axios.get(`${config.backendURL}/api/data`)
            .then((response) => {
                setData(response.data);
            })
            .catch((error) => {
                console.error("Erreur lors de la récupération des données :", error);
            });
    }, []);

  //  return (
    //    <div>
      //      <h1>Liste des données</h1>
        //    <ul>
          //      {data.map((item, index) => (
            //        <li key={index}>{item.nom}</li>
     //           ))}
       //     </ul>
       // </div>
   // );
  
  
  
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
      {direction === 'rtl' ? (
        <CacheProvider value={cacheRtl}>
          <ThemeProvider theme={themeWithDirection}>
            <CssBaseline />
            <Layout setDirection={setDirection}>
              <AppRoutes />
            </Layout>
          </ThemeProvider>
        </CacheProvider>
      ) : (
        <ThemeProvider theme={themeWithDirection}>
          <CssBaseline />
          <Layout setDirection={setDirection}>
            <AppRoutes />
          </Layout>
        </ThemeProvider>
      )}
    </Router>
  );
}


// Définition des routes
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/fournisseurs" element={<FournisseursPage />} />
      <Route path="/dossiers" element={<DossiersPage />} />
      <Route path="/dossiers/:id" element={<DossierDetailsPage />} />
      <Route path="/transactions" element={<TransactionsPage />} />
      <Route path="/caisse" element={<CaissePage />} />
      <Route path="/chatbot" element={<ChatbotPage />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
// API pour récupérer des données depuis le backend :



export default App;
