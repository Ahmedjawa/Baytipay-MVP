import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Composants de pages
import Login from './pages/Login';
import VentePage from './pages/Vente';
import VentesList from './pages/VentesList';
// ... autres imports ...

// Composant de protection des routes
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Route publique */}
      <Route path="/login" element={<Login />} />

      {/* Routes protégées */}
      <Route
        path="/ventes/nouvelle"
        element={
          <ProtectedRoute>
            <VentePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ventes"
        element={
          <ProtectedRoute>
            <VentesList />
          </ProtectedRoute>
        }
      />
      {/* ... autres routes protégées ... */}

      {/* Redirection par défaut */}
      <Route path="/" element={<Navigate to="/ventes" />} />
    </Routes>
  );
};

export default AppRoutes; 