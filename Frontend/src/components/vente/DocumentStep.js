// components/vente/DocumentStep.js
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, Divider, 
  Button, CircularProgress, Alert
} from '@mui/material';
import { 
  Receipt, Description, ReceiptLong, 
  PictureAsPdf, FileCopy, Print
} from '@mui/icons-material';
import apiClient from '../../utils/apiClient';
import DocumentManager from '../documents/DocumentManager';

/**
 * Composant pour gérer les documents liés à une vente
 * Ce composant peut être utilisé comme étape finale du processus de vente ou comme onglet séparé
 */
const DocumentStep = ({ venteId, mode = 'step' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [venteData, setVenteData] = useState(null);
  const [documents, setDocuments] = useState([]);

  // Charger les données de la vente et les documents associés
  useEffect(() => {
    const fetchData = async () => {
      if (!venteId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const [venteResponse, documentsResponse] = await Promise.all([
          apiClient.get(`api/ventes/${venteId}`),
          apiClient.get(`api/documents/vente/${venteId}`)
        ]);
        
        setVenteData(venteResponse.data);
        setDocuments(documentsResponse.data);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError(error.message || 'Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [venteId]);

  // Recharger les documents après génération
  const handleDocumentGenerated = async () => {
    try {
      const response = await apiClient.get(`api/documents/vente/${venteId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Erreur lors du rechargement des documents:', error);
    }
  };

  // Affichage pendant le chargement
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  // Si pas d'ID de vente ou vente non trouvée
  if (!venteId || !venteData) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Aucune vente sélectionnée ou vente introuvable.
      </Alert>
    );
  }
  
  // Affichage du récapitulatif de la vente (en mode étape)
  const renderVenteRecap = () => {
    if (mode !== 'step') return null;
    
    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Récapitulatif de la vente
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Client</Typography>
              <Typography variant="body1">
                {venteData.client?.raisonSociale || 
                  `${venteData.client?.prenom || ''} ${venteData.client?.nom || ''}`}
              </Typography>
              {venteData.client?.matriculeFiscale && (
                <Typography variant="body2" color="text.secondary">
                  M.F: {venteData.client.matriculeFiscale}
                </Typography>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Détails de la vente</Typography>
              <Typography variant="body2">
                Date: {new Date(venteData.dateVente).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                Montant: {venteData.montantTotalTTC?.toFixed(2)} TND
              </Typography>
              <Typography variant="body2">
                Statut: {venteData.statut}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Articles ({venteData.lignes?.length || 0})
        </Typography>
        
        {venteData.lignes && venteData.lignes.map((ligne, index) => (
          <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              {ligne.quantite} x {ligne.designation}
            </Typography>
            <Typography variant="body2">
              {ligne.montantTTC?.toFixed(2)} TND
            </Typography>
          </Box>
        ))}
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1">Total</Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {venteData.montantTotalTTC?.toFixed(2)} TND
          </Typography>
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      {renderVenteRecap()}
      
      <DocumentManager 
        venteId={venteId} 
        documents={documents} 
        onDocumentGenerated={handleDocumentGenerated} 
      />
    </Box>
  );
};

export default DocumentStep;