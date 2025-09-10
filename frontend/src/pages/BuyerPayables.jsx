import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { FaShoppingCart, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import './BuyerPayables.css';

const BuyerPayables = () => {
  const { account, contracts, getUSDCBalance } = useWeb3();
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [acceptedInvoices, setAcceptedInvoices] = useState([]);
  const [settledInvoices, setSettledInvoices] = useState([]);
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [totalPayables, setTotalPayables] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (account) {
      loadBuyerData();
    }
  }, [account, contracts]);

  const loadBuyerData = async () => {
    try {
      // Get USDC balance
      const balance = await getUSDCBalance(account);
      setUsdcBalance(balance);

      // Load invoices from backend
      const response = await axios.get('http://localhost:3333/api/invoices/verified');
      if (response.data.success) {
        const buyerInvoices = response.data.invoices.filter(
          inv => inv.buyer.toLowerCase() === account.toLowerCase()
        );

        const pending = [];
        const accepted = [];
        const settled = [];
        let payables = 0n;

        for (const invoice of buyerInvoices) {
          if (invoice.blockchainStatus) {
            if (invoice.blockchainStatus.settled) {
              settled.push(invoice);
            } else if (invoice.blockchainStatus.buyerAccepted) {
              accepted.push(invoice);
              if (invoice.blockchainStatus.funded) {
                payables += BigInt(invoice.face_value);
              }
            } else {
              pending.push(invoice);
            }
          }
        }

        setPendingInvoices(pending);
        setAcceptedInvoices(accepted);
        setSettledInvoices(settled);
        setTotalPayables(ethers.formatUnits(payables, 6));
      }
    } catch (error) {
      console.error('Failed to load buyer data:', error);
    }
  };

  const handleAcceptInvoice = async (invoice) => {
    if (!account || !contracts.funding) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsProcessing(true);
    
    try {
      const tx = await contracts.funding.acceptInvoice(invoice.token_id);
      toast.loading('Accepting invoice...');
      await tx.wait();
      toast.dismiss();
      
      toast.success(`Invoice #${invoice.invoice_number} accepted`);
      loadBuyerData();
    } catch (error) {
      console.error('Failed to accept invoice:', error);
      toast.error('Failed to accept invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayInvoice = async (invoice) => {
    if (!account || !contracts.funding || !contracts.mockUSDC) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsProcessing(true);
    
    try {
      // First approve USDC spending
      const approveTx = await contracts.mockUSDC.approve(
        contracts.funding.target,
        invoice.face_value
      );
      
      toast.loading('Approving USDC...');
      await approveTx.wait();
      toast.dismiss();
      
      // Then pay the invoice
      const payTx = await contracts.funding.buyerPay(invoice.token_id);
      
      toast.loading('Settling invoice...');
      await payTx.wait();
      toast.dismiss();
      
      toast.success(`Invoice #${invoice.invoice_number} settled successfully`);
      loadBuyerData();
      
    } catch (error) {
      console.error('Failed to pay invoice:', error);
      toast.error('Failed to settle invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = due - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getDueDateStatus = (dueDate) => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return { class: 'overdue', text: 'Overdue', icon: <FaExclamationTriangle /> };
    if (days <= 7) return { class: 'urgent', text: `${days} days`, icon: <FaClock /> };
    return { class: 'normal', text: `${days} days`, icon: <FaClock /> };
  };

  return (
    <div className="buyer-payables">
      <div className="payables-header">
        <h1>Buyer Payables</h1>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-label">USDC Balance</span>
            <span className="stat-value">{parseFloat(usdcBalance).toFixed(2)} USDC</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Payables</span>
            <span className="stat-value warning">{parseFloat(totalPayables).toFixed(2)} USDC</span>
          </div>
          <div className="stat">
            <span className="stat-label">Pending Approval</span>
            <span className="stat-value">{pendingInvoices.length}</span>
          </div>
        </div>
      </div>

      <div className="payables-content">
        {/* Pending Acceptance */}
        <div className="section">
          <h2><FaClock /> Pending Acceptance</h2>
          {pendingInvoices.length === 0 ? (
            <div className="no-invoices">
              <p>No invoices pending acceptance</p>
            </div>
          ) : (
            <div className="invoices-grid">
              {pendingInvoices.map((invoice) => (
                <div key={invoice.token_id} className="invoice-card pending">
                  <div className="invoice-header">
                    <h3>#{invoice.invoice_number}</h3>
                    <span className="status-badge pending">
                      <FaClock /> Pending Review
                    </span>
                  </div>
                  <div className="invoice-details">
                    <div className="detail">
                      <span className="label">Amount:</span>
                      <span className="value">
                        {ethers.formatUnits(invoice.face_value, 6)} USDC
                      </span>
                    </div>
                    <div className="detail">
                      <span className="label">Supplier:</span>
                      <span className="value">
                        {invoice.supplier.slice(0, 6)}...{invoice.supplier.slice(-4)}
                      </span>
                    </div>
                    <div className="detail">
                      <span className="label">Due Date:</span>
                      <span className="value">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="accept-btn"
                    onClick={() => handleAcceptInvoice(invoice)}
                    disabled={isProcessing}
                  >
                    Accept Invoice
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Payables */}
        <div className="section">
          <h2><FaShoppingCart /> Active Payables</h2>
          {acceptedInvoices.length === 0 ? (
            <div className="no-invoices">
              <p>No active payables</p>
            </div>
          ) : (
            <div className="invoices-grid">
              {acceptedInvoices.map((invoice) => {
                const dueDateStatus = getDueDateStatus(invoice.due_date);
                const isFunded = invoice.blockchainStatus?.funded;
                
                return (
                  <div key={invoice.token_id} className="invoice-card active">
                    <div className="invoice-header">
                      <h3>#{invoice.invoice_number}</h3>
                      <span className={`due-date-badge ${dueDateStatus.class}`}>
                        {dueDateStatus.icon} {dueDateStatus.text}
                      </span>
                    </div>
                    <div className="invoice-details">
                      <div className="detail">
                        <span className="label">Amount Due:</span>
                        <span className="value">
                          {ethers.formatUnits(invoice.face_value, 6)} USDC
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Supplier:</span>
                        <span className="value">
                          {invoice.supplier.slice(0, 6)}...{invoice.supplier.slice(-4)}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Status:</span>
                        <span className="value">
                          {isFunded ? '✓ Funded by Lender' : '⏳ Awaiting Funding'}
                        </span>
                      </div>
                      <div className="detail">
                        <span className="label">Due Date:</span>
                        <span className="value">
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {isFunded && (
                      <button 
                        className="pay-btn"
                        onClick={() => handlePayInvoice(invoice)}
                        disabled={isProcessing}
                      >
                        Pay Invoice
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settled Invoices */}
        <div className="section">
          <h2><FaCheckCircle /> Settled Invoices</h2>
          {settledInvoices.length === 0 ? (
            <div className="no-invoices">
              <p>No settled invoices</p>
            </div>
          ) : (
            <div className="invoices-grid">
              {settledInvoices.map((invoice) => (
                <div key={invoice.token_id} className="invoice-card settled">
                  <div className="invoice-header">
                    <h3>#{invoice.invoice_number}</h3>
                    <span className="status-badge settled">
                      <FaCheckCircle /> Settled
                    </span>
                  </div>
                  <div className="invoice-details">
                    <div className="detail">
                      <span className="label">Amount Paid:</span>
                      <span className="value">
                        {ethers.formatUnits(invoice.face_value, 6)} USDC
                      </span>
                    </div>
                    <div className="detail">
                      <span className="label">Supplier:</span>
                      <span className="value">
                        {invoice.supplier.slice(0, 6)}...{invoice.supplier.slice(-4)}
                      </span>
                    </div>
                    <div className="detail">
                      <span className="label">Settled Date:</span>
                      <span className="value">
                        {new Date(invoice.registered_at).toLocaleDateString()}
                      </span>
                    </div>
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

export default BuyerPayables;
