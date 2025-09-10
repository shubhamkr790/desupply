const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Mock verification services
const verifyGST = async (gstin, invoiceNumber) => {
  // Mock GST verification
  console.log(`Verifying GST for GSTIN: ${gstin}, Invoice: ${invoiceNumber}`);
  // In production, this would call actual GST API
  return {
    verified: true,
    gstinValid: true,
    invoiceExists: true
  };
};

const verifyERP = async (buyer, invoiceNumber, amount) => {
  // Mock ERP verification
  console.log(`Verifying ERP for Buyer: ${buyer}, Invoice: ${invoiceNumber}, Amount: ${amount}`);
  // In production, this would call buyer's ERP API
  return {
    verified: true,
    poExists: true,
    amountMatches: true
  };
};

const verifyLogistics = async (invoiceNumber) => {
  // Mock logistics verification
  console.log(`Verifying logistics for Invoice: ${invoiceNumber}`);
  // In production, this would call logistics provider API
  return {
    verified: true,
    delivered: true,
    signedPOD: true
  };
};

// Blockchain interaction
class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.initialized = false;
  }

  async initialize() {
    try {
      // Setup provider (Sepolia)
      const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Setup signer
      const privateKey = process.env.ORACLE_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Oracle private key not configured');
      }
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      // Load contract ABIs and addresses
      await this.loadContracts();
      
      this.initialized = true;
      console.log('Blockchain service initialized');
      console.log('Oracle address:', this.signer.address);
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async loadContracts() {
    try {
      // Load deployment info (check Sepolia first, then hardhat)
      const sepoliaPath = path.join(__dirname, '..', '..', '..', 'deployments', 'sepolia.json');
      const hardhatPath = path.join(__dirname, '..', '..', '..', 'deployments', 'hardhat.json');
      let deployment;
      
      if (fs.existsSync(sepoliaPath)) {
        deployment = JSON.parse(fs.readFileSync(sepoliaPath, 'utf8'));
        console.log('Using Sepolia deployment');
      } else if (fs.existsSync(hardhatPath)) {
        deployment = JSON.parse(fs.readFileSync(hardhatPath, 'utf8'));
        console.log('Using Hardhat deployment');
      } else {
        // Use environment variables as fallback
        deployment = {
          contracts: {
            InvoiceNFT: process.env.INVOICE_NFT_ADDRESS,
            Funding: process.env.FUNDING_CONTRACT_ADDRESS,
            MockUSDC: process.env.MOCK_USDC_ADDRESS,
            ReputationRegistry: process.env.REPUTATION_ADDRESS
          }
        };
      }

      // Load ABIs
      const artifactsPath = path.join(__dirname, '..', '..', '..', 'artifacts', 'contracts');
      
      // InvoiceNFT
      const invoiceNFTABI = require(path.join(artifactsPath, 'InvoiceNFT.sol', 'InvoiceNFT.json')).abi;
      this.contracts.invoiceNFT = new ethers.Contract(
        deployment.contracts.InvoiceNFT,
        invoiceNFTABI,
        this.signer
      );

      // Funding
      const fundingABI = require(path.join(artifactsPath, 'Funding.sol', 'Funding.json')).abi;
      this.contracts.funding = new ethers.Contract(
        deployment.contracts.Funding,
        fundingABI,
        this.signer
      );

      // MockUSDC
      const mockUSDCABI = require(path.join(artifactsPath, 'MockUSDC.sol', 'MockUSDC.json')).abi;
      this.contracts.mockUSDC = new ethers.Contract(
        deployment.contracts.MockUSDC,
        mockUSDCABI,
        this.signer
      );

      console.log('Contracts loaded successfully');
    } catch (error) {
      console.error('Failed to load contracts:', error);
      throw error;
    }
  }

  async mintInvoice(supplier, buyer, invoiceHash, metadataURI) {
    if (!this.initialized) await this.initialize();
    
    try {
      const tx = await this.contracts.invoiceNFT.mintInvoice(
        supplier,
        buyer,
        invoiceHash,
        metadataURI
      );
      
      const receipt = await tx.wait();
      
      // Extract tokenId from events
      const mintEvent = receipt.logs.find(
        log => log.topics[0] === ethers.id('InvoiceMinted(uint256,address,address,bytes32,string)')
      );
      
      const tokenId = mintEvent ? parseInt(mintEvent.topics[1], 16) : null;
      
      return {
        success: true,
        tokenId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Failed to mint invoice:', error);
      throw error;
    }
  }

  async registerInvoice(tokenId, faceValue, buyer, dueDate) {
    if (!this.initialized) await this.initialize();
    
    try {
      const tx = await this.contracts.funding.registerInvoice(
        tokenId,
        faceValue,
        buyer,
        dueDate
      );
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      console.error('Failed to register invoice:', error);
      throw error;
    }
  }

  async getInvoiceDetails(tokenId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const details = await this.contracts.invoiceNFT.getInvoiceDetails(tokenId);
      return {
        supplier: details[0],
        buyer: details[1],
        invoiceHash: details[2],
        uri: details[3]
      };
    } catch (error) {
      console.error('Failed to get invoice details:', error);
      throw error;
    }
  }

  async getInvoiceStatus(tokenId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const status = await this.contracts.funding.getInvoiceStatus(tokenId);
      return {
        registered: status[0],
        buyerAccepted: status[1],
        funded: status[2],
        settled: status[3],
        defaulted: status[4]
      };
    } catch (error) {
      console.error('Failed to get invoice status:', error);
      throw error;
    }
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

module.exports = {
  verifyGST,
  verifyERP,
  verifyLogistics,
  blockchainService
};
