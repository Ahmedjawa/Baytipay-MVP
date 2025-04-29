import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h2" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        Page non trouvée
      </Typography>
      <Button variant="contained" component={Link} to="/">
        Retour à l'accueil
      </Button>
    </Box>
  );
}