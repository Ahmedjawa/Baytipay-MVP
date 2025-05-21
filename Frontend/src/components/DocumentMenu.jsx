// components/DocumentMenu.jsx
import React, { useState, useEffect } from 'react';
import { Menu, Button, MenuItem, Divider, CircularProgress, Box, Alert, Collapse } from '@mui/material';
import { Print, Download, Email, Preview, Refresh } from '@mui/icons-material';
import documentService, { DOCUMENT_TYPES } from '../services/documentService';
import { toast } from 'react-toastify';

const DocumentMenu = ({ 
  venteId, 
  isVente = true, 
  isDevis = false, 
  isBonLivraison = false,
  documentTypes: customDocumentTypes,
  onSelect,
  loading = false,
  onError = null
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuType, setMenuType] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [isLoading, setIsLoading] = useState(loading);
  const [error, setError] = useState(null);
  
  // Notification d'erreur au parent si nécessaire
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);
  
  const handleClick = (event, type) => {
    setAnchorEl(event.currentTarget);
    setMenuType(type);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
    setMenuType(null);
  };
  
  const handlePreview = async (docType) => {
    try {
      setError(null);
      setIsLoading(true);
      const docBlob = await documentService.previewDocument(venteId, docType);
      // Ouvrir la prévisualisation
      const docUrl = URL.createObjectURL(docBlob);
      window.open(docUrl, '_blank');
    } catch (error) {
      console.error('Erreur de prévisualisation:', error);
      setError(`Impossible de prévisualiser le document. ${error.response?.status === 500 ? 'Erreur serveur interne' : error.response?.data?.message || error.message || 'Erreur de serveur'}`);
      // Vérifier s'il s'agit d'une erreur d'authentification
      if (error.response?.status === 401) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else {
        toast.error('Erreur lors de la prévisualisation du document');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = async (docType) => {
    try {
      setError(null);
      setIsLoading(true);
      const docBlob = await documentService.generateDocument(venteId, docType);
      // Créer un lien de téléchargement
      const link = document.createElement('a');
      link.href = URL.createObjectURL(docBlob);
      link.download = `${docType.toLowerCase()}_${venteId}.pdf`;
      link.click();
      
      // Enregistrer le document
      await documentService.saveDocumentRecord(venteId, docType, {});
      toast.success('Document téléchargé avec succès');
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      setError(`Impossible de télécharger le document. ${error.response?.status === 500 ? 'Erreur serveur interne' : error.response?.data?.message || error.message || 'Erreur de serveur'}`);
      // Vérifier s'il s'agit d'une erreur d'authentification
      if (error.response?.status === 401) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
      } else {
        toast.error('Erreur lors du téléchargement du document');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendEmail = async (docType) => {
    try {
      setError(null);
      setIsLoading(true);
      // Implémenter l'envoi par email
      // Utiliser un dialogue pour demander l'adresse email
      console.log('Envoi par email du document:', docType);
      // Simulation d'attente
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.info('Fonctionnalité d\'envoi par email en cours de développement');
    } catch (error) {
      console.error('Erreur d\'envoi par email:', error);
      setError(`Impossible d'envoyer le document par email. ${error.message || 'Erreur de serveur'}`);
      toast.error('Erreur lors de l\'envoi par email');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Si des types de documents personnalisés sont fournis, on les utilise
  // Sinon, on utilise les types par défaut selon le contexte
  const documentTypes = customDocumentTypes || (isVente 
    ? [
        { key: DOCUMENT_TYPES.FACTURE_TTC, label: 'Facture TTC' },
        { key: DOCUMENT_TYPES.FACTURE_HT, label: 'Facture HT' },
        { key: DOCUMENT_TYPES.BON_LIVRAISON, label: 'Bon de livraison' },
        { key: DOCUMENT_TYPES.AVOIR, label: 'Avoir' },
        { key: DOCUMENT_TYPES.FACTURE_RAS, label: 'Facture avec retenue à la source' },
        { key: DOCUMENT_TYPES.FACTURE_FODEC, label: 'Facture avec FODEC' },
        { key: DOCUMENT_TYPES.RECU_FISCAL, label: 'Reçu fiscal' },
        { key: DOCUMENT_TYPES.FACTURE_ACOMPTE, label: 'Facture d\'acompte' },
        { key: DOCUMENT_TYPES.ATTESTATION_RAS, label: 'Attestation de retenue' },
        { key: DOCUMENT_TYPES.FACTURE_PROFORMA, label: 'Devis' }
      ]
    : [
        { key: DOCUMENT_TYPES.BON_COMMANDE, label: 'Bon de commande' }
      ]);
      
  // Si c'est un devis ou un bon de livraison, on filtre les options
  const filteredDocumentTypes = documentTypes.filter(doc => {
    if (isDevis) return doc.key === DOCUMENT_TYPES.FACTURE_PROFORMA;
    if (isBonLivraison) return doc.key === DOCUMENT_TYPES.BON_LIVRAISON;
    return true;
  });
  
  // Gestion de la sélection d'un document
  const handleDocumentSelect = (docType, action = 'preview') => {
    if (onSelect) {
      onSelect(docType);
      return;
    }
    
    setSelectedDocType(docType);
    
    switch (action) {
      case 'preview':
        handlePreview(docType);
        break;
      case 'download':
        handleDownload(docType);
        break;
      case 'email':
        handleSendEmail(docType);
        break;
      default:
        handlePreview(docType);
    }
    
    handleClose();
  };
  
  // Si aucun type de document n'est disponible, on ne rend rien
  if (filteredDocumentTypes.length === 0) {
    return null;
  }
  
  // Si un seul type de document est disponible, on affiche un bouton simple
  if (filteredDocumentTypes.length === 1) {
    const docType = filteredDocumentTypes[0];
    return (
      <>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Print />}
            onClick={() => handleDocumentSelect(docType.key, 'preview')}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} color="inherit" /> : docType.label}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleDocumentSelect(docType.key, 'download')}
            disabled={isLoading}
          >
            Télécharger
          </Button>
          <Button
            variant="outlined"
            startIcon={<Email />}
            onClick={() => handleDocumentSelect(docType.key, 'email')}
            disabled={isLoading}
          >
            Email
          </Button>
          {error && (
            <Button
              color="error"
              startIcon={<Refresh />}
              onClick={() => setError(null)}
              size="small"
            >
              Réessayer
            </Button>
          )}
        </Box>
        <Collapse in={Boolean(error)}>
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        </Collapse>
      </>
    );
  }
  
  // Pour plusieurs types de documents, on affiche un menu déroulant
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button 
          variant="contained"
          color="primary"
          startIcon={<Print />}
          onClick={(e) => handleClick(e, 'preview')}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Imprimer'}
        </Button>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl) && menuType === 'preview'}
          onClose={handleClose}
        >
          {filteredDocumentTypes.map((docType) => (
            <MenuItem 
              key={docType.key} 
              onClick={() => handleDocumentSelect(docType.key, 'preview')}
            >
              {docType.label}
            </MenuItem>
          ))}
        </Menu>
        
        <Button 
          variant="outlined"
          startIcon={<Download />}
          onClick={(e) => handleClick(e, 'download')}
          disabled={isLoading}
        >
          Télécharger
        </Button>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl) && menuType === 'download'}
          onClose={handleClose}
        >
          {filteredDocumentTypes.map((docType) => (
            <MenuItem 
              key={`download-${docType.key}`} 
              onClick={() => handleDocumentSelect(docType.key, 'download')}
            >
              {docType.label}
            </MenuItem>
          ))}
        </Menu>
        
        <Button 
          variant="outlined"
          startIcon={<Email />}
          onClick={(e) => handleClick(e, 'email')}
          disabled={isLoading}
        >
          Email
        </Button>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl) && menuType === 'email'}
          onClose={handleClose}
        >
          {filteredDocumentTypes.map((docType) => (
            <MenuItem 
              key={`email-${docType.key}`} 
              onClick={() => handleDocumentSelect(docType.key, 'email')}
            >
              {docType.label}
            </MenuItem>
          ))}
        </Menu>
        
        {error && (
          <Button
            color="error"
            startIcon={<Refresh />}
            onClick={() => setError(null)}
            size="small"
          >
            Réessayer
          </Button>
        )}
      </Box>
      
      <Collapse in={Boolean(error)}>
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      </Collapse>
    </>
  );
};

export default DocumentMenu;