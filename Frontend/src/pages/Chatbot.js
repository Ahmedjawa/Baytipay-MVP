import React from 'react';
import { Box, Typography } from '@mui/material';

export default function Chatbot() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Chatbot
      </Typography>
      <Typography variant="body1">
        La fonctionnalité de chatbot est en cours de développement. 🚀
      </Typography>
    </Box>
  );
}