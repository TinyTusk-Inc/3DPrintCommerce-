import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#DFF2EB' },
    secondary: { main: '#B9E5E8' },
    tertiary: { main: '#7AB2D3' },
    accent: { main: '#4A628A' },
    success: { main: '#27ae60' },
    warning: { main: '#f29d37' },
    background: {
      default: '#fafafa',
      paper: '#ffffff'
    }
  },
  shape: {
    borderRadius: 6
  },
  typography: {
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          borderRadius: 8
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600
        }
      }
    }
  }
});

export default theme;
