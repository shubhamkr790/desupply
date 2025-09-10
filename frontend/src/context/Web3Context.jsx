import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

// Import ABIs (we'll copy these from the artifacts)
import InvoiceNFTABI from '../contracts/InvoiceNFT.json';
import FundingABI from '../contracts/Funding.json';
import MockUSDCABI from '../contracts/MockUSDC.json';
import ReputationRegistryABI from '../contracts/ReputationRegistry.json';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkId, setNetworkId] = useState(null);
  const [balance, setBalance] = useState('0');

  // Contract addresses (will be fetched from backend)
  const [contractAddresses, setContractAddresses] = useState({
    invoiceNFT: null,
    funding: null,
    mockUSDC: null,
    reputation: null
  });

  // Fetch contract addresses from backend
  useEffect(() => {
    fetchContractAddresses();
  }, []);

  const fetchContractAddresses = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3333'}/api/contracts`);
      const data = await response.json();
      console.log('Fetched contract addresses:', data);
      setContractAddresses(data);
    } catch (error) {
      console.error('Failed to fetch contract addresses:', error);
      // Try to read from deployment file as fallback
      console.log('Using fallback contract addresses');
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask!');
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      const account = accounts[0];
      setAccount(account);

      // Setup provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      setProvider(provider);
      setSigner(signer);

      // Get network
      const network = await provider.getNetwork();
      setNetworkId(network.chainId.toString());

      // Get balance
      const balance = await provider.getBalance(account);
      setBalance(ethers.formatEther(balance));

      // Initialize contracts
      await initializeContracts(signer);

      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Initialize contracts
  const initializeContracts = async (signer) => {
    if (!contractAddresses.invoiceNFT) {
      console.error('Contract addresses not loaded');
      return;
    }

    try {
      const invoiceNFT = new ethers.Contract(
        contractAddresses.invoiceNFT,
        InvoiceNFTABI.abi,
        signer
      );

      const funding = new ethers.Contract(
        contractAddresses.funding,
        FundingABI.abi,
        signer
      );

      const mockUSDC = new ethers.Contract(
        contractAddresses.mockUSDC,
        MockUSDCABI.abi,
        signer
      );

      const reputation = new ethers.Contract(
        contractAddresses.reputation,
        ReputationRegistryABI.abi,
        signer
      );

      setContracts({
        invoiceNFT,
        funding,
        mockUSDC,
        reputation
      });

      console.log('Contracts initialized');
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContracts({});
    setBalance('0');
    toast.success('Wallet disconnected');
  };

  // Get USDC balance
  const getUSDCBalance = async (address) => {
    if (!contracts.mockUSDC) return '0';
    try {
      const balance = await contracts.mockUSDC.balanceOf(address || account);
      return ethers.formatUnits(balance, 6); // USDC has 6 decimals
    } catch (error) {
      console.error('Failed to get USDC balance:', error);
      return '0';
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const value = {
    account,
    provider,
    signer,
    contracts,
    isConnecting,
    networkId,
    balance,
    contractAddresses,
    connectWallet,
    disconnectWallet,
    getUSDCBalance
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

export default Web3Context;
