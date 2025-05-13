// components/depense/JustificatifStep.js
import React, { useState } from 'react';
import {
  Box, Grid, Typography, Button, List, ListItem,
  ListItemText, ListItemSecondaryAction, IconButton,
  Divider, Paper, Alert, Tooltip, CircularProgress
} from '@mui/material';
import {
  CloudUpload, RemoveCircle, ReceiptLong, FilePresent,
  InsertDriveFile, Visibility
} from '@mui/icons-material';

function JustificatifStep({ depenseData, updateDepenseData }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    // Simulation de l'upload (dans un vrai environnement, vous appelleriez votre API ici)
    const newJustificatifs = [...depenseData.justificatifs];
    
    Array.from(files).forEach((file) => {
      // Limiter la taille des fichiers (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Un fichier dépasse la taille maximale de 5MB');
        return;
      }

      // Vérifier l'extension du fichier
      const extension = file.name.split('.').pop().toLowerCase();
      const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
      
      if (!validExtensions.includes(extension)) {
        setError('Formats acceptés: PDF, JPEG, PNG');
        return;
      }

      // Création d'un nouvel objet justificatif avec un prévisualiseur si c'est une image
      const fileURL = URL.createObjectURL(file);
      
      newJustificatifs.push({
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nom: file.name,
        type: file.type,
        taille: file.size,
        dateUpload: new Date(),
        url: fileURL,
        estImage: file.type.startsWith('image/')
      });
    });

    // Mettre à jour l'état après un délai de simulation
    setTimeout(() => {
      updateDepenseData({ justificatifs: newJustificatifs });
      setUploading(false);
    }, 1000);

    // Réinitialiser l'input file
    event.target.value = null;
  };

  const handleRemoveJustificatif = (justificatifId) => {
    const newJustificatifs = depenseData.justificatifs.filter(
      (justificatif) => justificatif.id !== justificatifId
    );
    updateDepenseData({ justificatifs: newJustificatifs });
  };

  const handleViewJustificatif = (justificatif) => {
    // Dans une vraie app, vous pourriez ouvrir une modal ou rediriger vers une URL
    window.open(justificatif.url, '_blank');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} octets`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (justificatif) => {
    if (justificatif.estImage) return <InsertDriveFile />;
    if (justificatif.type === 'application/pdf') return <ReceiptLong />;
    return <FilePresent />;
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>Pièces justificatives</Typography>
      
      <Grid container spacing={3}>
        {/* Zone d'upload */}
        <Grid item xs={12}>
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'background.default',
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <ReceiptLong sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 2 }}>
              Déposez vos pièces justificatives ici ou
            </Typography>
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUpload />}
              disabled={uploading}
            >
              {uploading ? 'Chargement...' : 'Parcourir'}
              <input
                type="file"
                hidden
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
              />
            </Button>
            <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>
              Formats acceptés: PDF, JPEG, PNG. Taille max: 5MB par fichier
            </Typography>
            {uploading && <CircularProgress size={24} sx={{ mt: 2 }} />}
          </Paper>
        </Grid>
        
        {/* Message d'erreur */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </Grid>
        )}
        
        {/* Liste des justificatifs */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Justificatifs ({depenseData.justificatifs.length})
          </Typography>
          
          {depenseData.justificatifs.length === 0 ? (
            <Alert severity="info">
              Aucun justificatif n'a été ajouté pour cette dépense.
            </Alert>
          ) : (
            <List>
              {depenseData.justificatifs.map((justificatif, index) => (
                <React.Fragment key={justificatif.id}>
                  <ListItem
                    sx={{
                      backgroundColor: 'background.paper',
                      borderRadius: 1,
                      my: 1,
                    }}
                  >
                    <ListItemText
                      primary={justificatif.nom}
                      secondary={`${formatFileSize(justificatif.taille)} • ${new Date(justificatif.dateUpload).toLocaleDateString()}`}
                      sx={{ pr: 6 }}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Voir le document">
                        <IconButton
                          edge="end"
                          onClick={() => handleViewJustificatif(justificatif)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveJustificatif(justificatif.id)}
                        >
                          <RemoveCircle />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < depenseData.justificatifs.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default JustificatifStep;