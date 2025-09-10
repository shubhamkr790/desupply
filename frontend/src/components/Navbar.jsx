import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { FaWallet, FaHome, FaFileInvoice, FaMoneyBillWave, FaShoppingCart } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const { account, connectWallet, disconnectWallet, balance } = useWeb3();
  const location = useLocation();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <FaFileInvoice /> DeSupply
        </Link>

        <div className="navbar-menu">
          <Link 
            to="/" 
            className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <FaHome /> Home
          </Link>
          <Link 
            to="/supplier" 
            className={`navbar-link ${location.pathname === '/supplier' ? 'active' : ''}`}
          >
            <FaFileInvoice /> Supplier
          </Link>
          <Link 
            to="/lender" 
            className={`navbar-link ${location.pathname === '/lender' ? 'active' : ''}`}
          >
            <FaMoneyBillWave /> Lender
          </Link>
          <Link 
            to="/buyer" 
            className={`navbar-link ${location.pathname === '/buyer' ? 'active' : ''}`}
          >
            <FaShoppingCart /> Buyer
          </Link>
        </div>

        <div className="navbar-wallet">
          {account ? (
            <div className="wallet-info">
              <span className="balance">{parseFloat(balance).toFixed(4)} ETH</span>
              <button className="wallet-address" onClick={disconnectWallet}>
                <FaWallet /> {formatAddress(account)}
              </button>
            </div>
          ) : (
            <button className="connect-btn" onClick={connectWallet}>
              <FaWallet /> Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
