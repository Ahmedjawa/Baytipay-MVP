import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/apiClient';
import VenteSteps from './VenteSteps';

const TransformDevisDialog = ({ open, onClose, selectedDevisIds }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (open && selectedDevisIds?.length > 0) {
      fetchDevisData();
    }
  }, [open, selectedDevisIds]);

  const fetchDevisData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post('/api/ventes/transformer-devis-en-bl', {
        devisIds: selectedDevisIds
      });

      if (response.data.success) {
        const bonLivraisonData = response.data.data.bonLivraisonData;
        setFormData({
          typeDocument: 'BON_LIVRAISON',
          clientId: bonLivraisonData.clientId,
          dateVente: new Date(),
          modePaiement: 'ESPECES',
          notesInternes: '',
          numeroDocument: bonLivraisonData.numeroDocument,
          lignesTransaction: bonLivraisonData.lignesTransaction || [],
          montantTotalHT: bonLivraisonData.montantTotalHT || 0,
          montantTotalTTC: bonLivraisonData.montantTotalTTC || 0,
          montantTaxes: bonLivraisonData.montantTaxes || 0
        });
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur lors de la récupération des données');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (finalData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/api/ventes/sauvegarder-bon-livraison', {
        bonLivraisonData: finalData,
        devisIds: selectedDevisIds
      });

      if (response.data.success) {
        onClose();
        navigate(`/ventes/${response.data.data.bonLivraison._id}`);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur lors de la sauvegarde du bon de livraison');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Transformer {selectedDevisIds?.length} devis en bon de livraison
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {formData && (
          <VenteSteps
            initialData={formData}
            onSubmit={handleSubmit}
            isTransform={true}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransformDevisDialog; 