import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { FaMoneyBillWave, FaChartLine, FaCalendar, FaPercent } from 'react-icons/fa';
import axios from 'axios';
import './LenderMarketplace.css';

const LenderMarketplace = () => {
  const { account, contracts, getUSDCBalance } = useWeb3();
  const [availableInvoices, setAvailableInvoices] = useState([]);
  const [fundedInvoices, setFundedInvoices] = useState([]);
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [totalInvested, setTotalInvested] = useState('0');
  const [totalReturns, setTotalReturns] = useState('0');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [fundingAmount, setFundingAmount] = useState('');
  const [isFunding, setIsFunding] = useState(false);

  useEffect(() => {
    if (account) {
      loadMarketplaceData();
    }
  }, [account, contracts]);

  const loadMarketplaceData = async () => {
    try {
      // Get USDC balance
      const balance = await getUSDCBalance(account);
      setUsdcBalance(balance);

      // Load verified invoices from backend
      const response = await axios.get('http://localhost:3333/api/invoices/verified');
      if (response.data.success) {
        // Separate available and funded invoices
        const available = [];
        const funded = [];
        
        for (const invoice of response.data.invoices) {
          if (invoice.blockchainStatus) {
            if (!invoice.blockchainStatus.funded && invoice.blockchainStatus.buyerAccepted) {
              available.push(invoice);
            } else if (invoice.blockchainStatus.funded) {
              // Check if current user is the funder
              if (contracts.funding) {
                try {
                  const position = await contracts.funding.fundingPositions(invoice.token_id);
                  if (position.funder.toLowerCase() === account.toLowerCase()) {
                    funded.push({
                      ...invoice,
                      fundingPosition: {
                        purchasePrice: position.purchasePrice.toString(),
                        faceValue: position.faceValue.toString(),
                        settled: position.settled
                      }
                    });
                  }
                } catch (error) {
                  console.error('Error fetching funding position:', error);
                }
              }
            }
          }
        }
        
        setAvailableInvoices(available);
        setFundedInvoices(funded);
        
        // Calculate total invested and returns
        let invested = 0n;
        let returns = 0n;
        
        for (const invoice of funded) {
          if (invoice.fundingPosition) {
            invested += BigInt(invoice.fundingPosition.purchasePrice);
            if (invoice.fundingPosition.settled) {
              returns += BigInt(invoice.fundingPosition.faceValue) - BigInt(invoice.fundingPosition.purchasePrice);
            }
          }
        }
        
        setTotalInvested(ethers.formatUnits(invested, 6));
        setTotalReturns(ethers.formatUnits(returns, 6));
      }
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
    }
  };

  const calculateDiscount = (faceValue, purchasePrice) => {
    const discount = ((parseFloat(faceValue) - parseFloat(purchasePrice)) / parseFloat(faceValue)) * 100;
    return discount.toFixed(2);
  };

  const calculateAPR = (faceValue, purchasePrice, daysUntilDue) => {
    const profit = parseFloat(faceValue) - parseFloat(purchasePrice);
    const returnRate = profit / parseFloat(purchasePrice);
    const apr = (returnRate * 365 / daysUntilDue) * 100;
    return apr.toFixed(2);
  };

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleFundInvoice = async (invoice) => {
    if (!account) {
      toast.error('Please connect your wallet');
      return;
    }

    setSelectedInvoice(invoice);
    // Default to 92% of face value as purchase price
    const defaultPurchasePrice = (parseFloat(ethers.formatUnits(invoice.face_value, 6)) * 0.92).toFixed(2);
    setFundingAmount(defaultPurchasePrice);
  };

  const confirmFunding = async () => {
    if (!selectedInvoice || !fundingAmount) return;

    setIsFunding(true);
    
    try {
      const purchasePriceWei = ethers.parseUnits(fundingAmount, 6);
      
      // First approve USDC spending
      const approveTx = await contracts.mockUSDC.approve(
        contracts.funding.target,
        purchasePriceWei
      );
      
      toast.loading('Approving USDC...');
      await approveTx.wait();
      toast.dismiss();
      
      // Then fund the invoice
      const fundTx = await contracts.funding.fundInvoiceWhole(
        selectedInvoice.token_id,
        purchasePriceWei
      );
      
      toast.loading('Funding invoice...');
      await fundTx.wait();
      toast.dismiss();
      
      toast.success(`Successfully funded invoice #${selectedInvoice.invoice_number}`);
      
      // Reset and reload
      setSelectedInvoice(null);
      setFundingAmount('');
      loadMarketplaceData();
      
    } catch (error) {
      console.error('Failed to fund invoice:', error);
      toast.error('Failed to fund invoice');
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div className="lender-marketplace">
      <div className="marketplace-header">
        <h1>Lender Marketplace</h1>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-label">USDC Balance</span>
            <span className="stat-value">{parseFloat(usdcBalance).toFixed(2)} USDC</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Invested</span>
            <span className="stat-value">{parseFloat(totalInvested).toFixed(2)} USDC</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Returns</span>
            <span className="stat-value success">+{parseFloat(totalReturns).toFixed(2)} USDC</span>
          </div>
        </div>
      </div>

      <div className="marketplace-content">
        <div className="available-section">
          <h2><FaMoneyBillWave /> Available Invoices</h2>
          {availableInvoices.length === 0 ? (
            <div className="no-invoices">
              <p>No invoices available for funding</p>
            </div>
          ) : (
            <div className="invoices-grid">
              {availableInvoices.map((invoice) => {
                const faceValue = parseFloat(ethers.formatUnits(invoice.face_value, 6));
                const purchasePrice = faceValue * 0.92; // 8% discount
                const daysUntilDue = getDaysUntilDue(invoice.due_date);
                const apr = calculateAPR(faceValue, purchasePrice, daysUntilDue);
                
                return (
                  <div key={invoice.token_id} className="invoice-card available">
                    <div className="invoice-header">
                      <h3>#{invoice.invoice_number}</h3>
                      <span className="apr-badge"><FaPercent /> {apr}% APR</span>
                    </div>
                    <div className="invoice-details">
                      <div className="detail">
                        <span className="label">Face Value:</span>
                        <span className="value">{faceValue.toFixed(2)} USDC</span>
                      </div>
                      <div className="detail">
                        <span className="label">Purchase Price:</span>
                        <span className="value success">{purchasePrice.toFixed(2)} USDC</span>
                      </div>
                      <div className="detail">
                        <span className="label">Discount:</span>
                        <span className="value">8%</span>
                      </div>
                      <div className="detail">
                        <span className="label">Days Until Due:</span>
                        <span className="value"><FaCalendar /> {daysUntilDue} days</span>
                      </div>
                      <div className="detail">
                        <span className="label">Supplier:</span>
                        <span className="value">
                          {invoice.supplier.slice(0, 6)}...{invoice.supplier.slice(-4)}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Buyer:</span>
                        <span className="value">
                          {invoice.buyer.slice(0, 6)}...{invoice.buyer.slice(-4)}
                        </span>
                      </div>
                    </div>
                    <button 
                      className="fund-btn"
                      onClick={() => handleFundInvoice(invoice)}
                      disabled={!account}
                    >
                      Fund Invoice
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="funded-section">
          <h2><FaChartLine /> My Funded Invoices</h2>
          {fundedInvoices.length === 0 ? (
            <div className="no-invoices">
              <p>You haven't funded any invoices yet</p>
            </div>
          ) : (
            <div className="invoices-grid">
              {fundedInvoices.map((invoice) => {
                const purchasePrice = parseFloat(ethers.formatUnits(invoice.fundingPosition.purchasePrice, 6));
                const faceValue = parseFloat(ethers.formatUnits(invoice.fundingPosition.faceValue, 6));
                const profit = faceValue - purchasePrice;
                
                return (
                  <div key={invoice.token_id} className="invoice-card funded">
                    <div className="invoice-header">
                      <h3>#{invoice.invoice_number}</h3>
                      <span className={`status-badge ${invoice.fundingPosition.settled ? 'settled' : 'active'}`}>
                        {invoice.fundingPosition.settled ? '✓ Settled' : '⏱ Active'}
                      </span>
                    </div>
                    <div className="invoice-details">
                      <div className="detail">
                        <span className="label">Invested:</span>
                        <span className="value">{purchasePrice.toFixed(2)} USDC</span>
                      </div>
                      <div className="detail">
                        <span className="label">Face Value:</span>
                        <span className="value">{faceValue.toFixed(2)} USDC</span>
                      </div>
                      <div className="detail">
                        <span className="label">Expected Profit:</span>
                        <span className="value success">+{profit.toFixed(2)} USDC</span>
                      </div>
                      <div className="detail">
                        <span className="label">Due Date:</span>
                        <span className="value">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Funding Modal */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Fund Invoice #{selectedInvoice.invoice_number}</h2>
            <div className="modal-content">
              <div className="modal-detail">
                <span>Face Value:</span>
                <span>{ethers.formatUnits(selectedInvoice.face_value, 6)} USDC</span>
              </div>
              <div className="modal-detail">
                <span>Purchase Price:</span>
                <input
                  type="number"
                  value={fundingAmount}
                  onChange={(e) => setFundingAmount(e.target.value)}
                  step="0.01"
                />
              </div>
              <div className="modal-detail">
                <span>Expected Return:</span>
                <span className="success">
                  {((parseFloat(ethers.formatUnits(selectedInvoice.face_value, 6)) / parseFloat(fundingAmount) - 1) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setSelectedInvoice(null)} disabled={isFunding}>
                Cancel
              </button>
              <button className="primary" onClick={confirmFunding} disabled={isFunding}>
                {isFunding ? 'Funding...' : 'Confirm Funding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LenderMarketplace;
