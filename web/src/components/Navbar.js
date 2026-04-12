import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/index';
import { useCart } from '../hooks/index';

function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { itemCount } = useCart();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          🖨️ 3D Print Commerce
        </Link>

        <ul className="navbar-nav">
          <li>
            <Link to="/products" className="nav-link">
              Products
            </Link>
          </li>

          {isAuthenticated ? (
            <>
              <li>
                <Link to="/orders" className="nav-link">
                  Orders
                </Link>
              </li>
              <li>
                <Link to="/cart" className="nav-link">
                  Cart
                  {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link to="/admin" className="nav-link">
                    Admin
                  </Link>
                </li>
              )}
              <li>
                <Link to="/profile" className="nav-link">
                  {user?.name || 'Profile'}
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="nav-link"
                  style={{ background: 'none', border: 'none', padding: '8px 12px' }}
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login" className="nav-link">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="nav-link">
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
