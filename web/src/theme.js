import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#3498db' },
    secondary: { main: '#764ba2' },
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
