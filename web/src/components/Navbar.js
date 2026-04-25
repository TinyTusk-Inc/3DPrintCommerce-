import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/index';
import { useCart } from '../hooks/index';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';

function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { itemCount } = useCart();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <AppBar position="sticky" color="primary">
      <Toolbar sx={{ minHeight: 'var(--navbar-height, 64px)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Link to="/" style={{ display: 'block', height: '100%' }}>
            <Box
              component="img"
              src={process.env.PUBLIC_URL + '/assets/logo_transperant.png'}
              alt="3D Print Commerce"
              sx={{ height: '100%', width: 'auto', maxHeight: 64 }}
            />
          </Link>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button color="inherit" component={Link} to="/products">
            Products
          </Button>

          {isAuthenticated ? (
            <>
              <Button color="inherit" component={Link} to="/orders">
                Orders
              </Button>

              <Button color="inherit" component={Link} to="/cart">
                <Badge badgeContent={itemCount} color="error">
                  Cart
                </Badge>
              </Button>

              {isAdmin && (
                <Button color="inherit" component={Link} to="/admin">
                  Admin
                </Button>
              )}

              <Button color="inherit" component={Link} to="/profile">
                {user?.name || 'Profile'}
              </Button>

              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                Login
              </Button>
              <Button color="inherit" component={Link} to="/register">
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
