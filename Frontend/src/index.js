import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';  // Si tu utilises un fichier CSS pour le style
import App from './App';

// Créer une racine
const container = document.getElementById('root');
const root = createRoot(container);

// Rendre l'application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
