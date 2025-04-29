import React from 'react';
import { Box, Typography } from '@mui/material';

export default function Settings() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Paramètres
      </Typography>
      <Typography variant="body1">
        Page de gestion des paramètres utilisateur.
      </Typography>
    </Box>
  );
}