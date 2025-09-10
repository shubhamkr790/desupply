import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { FaUpload, FaCheckCircle, FaClock, FaMoneyBillWave } from 'react-icons/fa';
import axios from 'axios';
import './SupplierDashboard.css';

const SupplierDashboard = () => {
  const { account, contracts, getUSDCBalance } = useWeb3();
  const [invoices, setInvoices] = useState([]);
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [reputation, setReputation] = useState(100);
  const [uploadForm, setUploadForm] = useState({
    invoiceNumber: '',
    buyerAddress: '',
    amount: '',
    dueDate: '',
    gstin: '',
    file: null
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (account) {
      loadSupplierData();
    }
  }, [account, contracts]);

  const loadSupplierData = async () => {
    try {
      // Get USDC balance
      const balance = await getUSDCBalance(account);
      setUsdcBalance(balance);

      // Get reputation score
      if (contracts.reputation) {
        const rep = await contracts.reputation.getReputation(account);
        setReputation(rep[0].toString());
      }

      // Load invoices from backend
      // In production, this would filter by supplier address
      const response = await axios.get('http://localhost:3333/api/invoices/verified');
      if (response.data.success) {
        const supplierInvoices = response.data.invoices.filter(
          inv => inv.supplier.toLowerCase() === account.toLowerCase()
        );
        setInvoices(supplierInvoices);
      }
    } catch (error) {
      console.error('Failed to load supplier data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUploadForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setUploadForm(prev => ({
      ...prev,
      file: e.target.files[0]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsUploading(true);
    
    try {
      // Convert amount to smallest unit (paise for INR, or wei for USDC)
      const amountInSmallestUnit = ethers.parseUnits(uploadForm.amount, 6); // USDC has 6 decimals

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('supplier', account);
      formData.append('buyer', uploadForm.buyerAddress);
      formData.append('invoiceNumber', uploadForm.invoiceNumber);
      formData.append('amount', amountInSmallestUnit.toString());
      formData.append('dueDate', uploadForm.dueDate);
      formData.append('gstin', uploadForm.gstin);
      formData.append('issueDate', new Date().toISOString());
      
      // Add file if present
      if (uploadForm.file) {
        formData.append('invoiceFile', uploadForm.file);
      }

      // Call backend to verify and mint with file upload
      const response = await axios.post('http://localhost:3333/api/verify-and-mint', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success(`Invoice minted successfully! Token ID: ${response.data.tokenId}`);
        
        // Reset form
        setUploadForm({
          invoiceNumber: '',
          buyerAddress: '',
          amount: '',
          dueDate: '',
          gstin: '',
          file: null
        });
        
        // Reload invoices
        loadSupplierData();
      }
    } catch (error) {
      console.error('Failed to upload invoice:', error);
      toast.error(error.response?.data?.error || 'Failed to upload invoice');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'minted': { icon: <FaClock />, class: 'pending', text: 'Awaiting Funding' },
      'funded': { icon: <FaMoneyBillWave />, class: 'funded', text: 'Funded' },
      'settled': { icon: <FaCheckCircle />, class: 'settled', text: 'Settled' }
    };
    
    const statusInfo = statusMap[status] || statusMap['minted'];
    
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        {statusInfo.icon} {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="supplier-dashboard">
      <div className="dashboard-header">
        <h1>Supplier Dashboard</h1>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-label">USDC Balance</span>
            <span className="stat-value">{parseFloat(usdcBalance).toFixed(2)} USDC</span>
          </div>
          <div className="stat">
            <span className="stat-label">Reputation Score</span>
            <span className="stat-value">{reputation}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Invoices</span>
            <span className="stat-value">{invoices.length}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="upload-section">
          <h2><FaUpload /> Upload New Invoice</h2>
          <form onSubmit={handleSubmit} className="upload-form">
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                name="invoiceNumber"
                value={uploadForm.invoiceNumber}
                onChange={handleInputChange}
                placeholder="INV-2025-001"
                required
              />
            </div>

            <div className="form-group">
              <label>Buyer Address</label>
              <input
                type="text"
                name="buyerAddress"
                value={uploadForm.buyerAddress}
                onChange={handleInputChange}
                placeholder="0x..."
                required
              />
            </div>

            <div className="form-group">
              <label>Amount (USDC)</label>
              <input
                type="number"
                name="amount"
                value={uploadForm.amount}
                onChange={handleInputChange}
                placeholder="50000"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={uploadForm.dueDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>GSTIN</label>
              <input
                type="text"
                name="gstin"
                value={uploadForm.gstin}
                onChange={handleInputChange}
                placeholder="29ABCDE1234F2Z5"
                required
              />
            </div>

            <div className="form-group">
              <label>Invoice Receipt/Document</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              {uploadForm.file && (
                <p className="file-selected">Selected: {uploadForm.file.name}</p>
              )}
            </div>

            <button 
              type="submit" 
              className="submit-btn"
              disabled={isUploading || !account}
            >
              {isUploading ? 'Uploading...' : 'Upload & Verify Invoice'}
            </button>
          </form>
        </div>

        <div className="invoices-section">
          <h2>My Invoices</h2>
          {invoices.length === 0 ? (
            <div className="no-invoices">
              <p>No invoices uploaded yet</p>
            </div>
          ) : (
            <div className="invoices-grid">
              {invoices.map((invoice) => (
                <div key={invoice.token_id} className="invoice-card">
                  <div className="invoice-header">
                    <h3>#{invoice.invoice_number}</h3>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="invoice-details">
                    <div className="detail">
                      <span className="label">Token ID:</span>
                      <span className="value">{invoice.token_id}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Amount:</span>
                      <span className="value">
                        {ethers.formatUnits(invoice.face_value || '0', 6)} USDC
                      </span>
                    </div>
                    <div className="detail">
                      <span className="label">Due Date:</span>
                      <span className="value">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="detail">
                      <span className="label">Buyer:</span>
                      <span className="value">
                        {invoice.buyer.slice(0, 6)}...{invoice.buyer.slice(-4)}
                      </span>
                    </div>
                    {invoice.blockchainStatus && (
                      <div className="blockchain-status">
                        <span className="label">Blockchain Status:</span>
                        <div className="status-flags">
                          {invoice.blockchainStatus.registered && <span className="flag">✓ Registered</span>}
                          {invoice.blockchainStatus.buyerAccepted && <span className="flag">✓ Accepted</span>}
                          {invoice.blockchainStatus.funded && <span className="flag">✓ Funded</span>}
                          {invoice.blockchainStatus.settled && <span className="flag">✓ Settled</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
