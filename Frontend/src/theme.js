import { createTheme } from '@mui/material/styles';

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

export default theme;