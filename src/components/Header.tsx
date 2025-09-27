import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Header() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <img src="/8bitpay-logo.png" alt="8Bit Pay" />
        </div>

        <nav className="navigation">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            Marketplace
          </Link>
          <Link
            to="/product-listing"
            className={`nav-link ${isActive('/product-listing') ? 'active' : ''}`}
          >
            List Product
          </Link>
          <Link
            to="/profile"
            className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
          >
            Profile
          </Link>
        </nav>

        <div className="wallet-section">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}