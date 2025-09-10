const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { initDatabase, createUser, getUser, getEvents } = require('./db/database');
const { 
  verifyAndMint, 
  getVerifiedInvoices, 
  getInvoiceDetails 
} = require('./controllers/verifyController');
const { blockchainService } = require('./services/oracle');

const app = express();
const PORT = process.env.PORT || 3333;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed'));
    }
  }
});

// Initialize database and blockchain service
const initialize = async () => {
  try {
    await initDatabase();
    console.log('Database initialized');
    
    await blockchainService.initialize();
    console.log('Blockchain service initialized');
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    oracle: blockchainService.initialized ? 'connected' : 'disconnected'
  });
});

// User management
app.post('/api/users/register', async (req, res) => {
  try {
    const userData = req.body;
    
    // Check if user already exists
    const existingUser = await getUser(userData.address);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    await createUser(userData);
    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:address', async (req, res) => {
  try {
    const user = await getUser(req.params.address);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Invoice verification and minting with file upload
app.post('/api/verify-and-mint', upload.single('invoiceFile'), verifyAndMint);

// Get verified invoices (marketplace)
app.get('/api/invoices/verified', getVerifiedInvoices);

// Get specific invoice details
app.get('/api/invoices/:tokenId', getInvoiceDetails);

// Get events for an invoice
app.get('/api/events/:tokenId', async (req, res) => {
  try {
    const events = await getEvents(req.params.tokenId);
    res.json({ success: true, events });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Funding endpoints (these interact directly with smart contracts via frontend)
app.post('/api/funder/fund', async (req, res) => {
  // This endpoint is mainly for recording/validation
  // Actual funding happens through frontend wallet interaction
  res.json({ 
    message: 'Please execute funding transaction through your wallet',
    contractAddress: process.env.FUNDING_CONTRACT_ADDRESS
  });
});

app.post('/api/buyer/accept/:tokenId', async (req, res) => {
  // Record buyer acceptance (actual blockchain call from frontend)
  res.json({ 
    message: 'Please execute acceptance transaction through your wallet',
    contractAddress: process.env.FUNDING_CONTRACT_ADDRESS
  });
});

app.post('/api/buyer/pay/:tokenId', async (req, res) => {
  // Record buyer payment (actual blockchain call from frontend)
  res.json({ 
    message: 'Please execute payment transaction through your wallet',
    contractAddress: process.env.FUNDING_CONTRACT_ADDRESS
  });
});

// Contract addresses for frontend
app.get('/api/contracts', (req, res) => {
  // Try to read from deployment file first
  try {
    const deploymentPath = path.join(__dirname, '..', '..', 'deployments', 'hardhat.json');
    if (require('fs').existsSync(deploymentPath)) {
      const deployment = JSON.parse(require('fs').readFileSync(deploymentPath, 'utf8'));
      res.json({
        invoiceNFT: deployment.contracts.InvoiceNFT,
        funding: deployment.contracts.Funding,
        mockUSDC: deployment.contracts.MockUSDC,
        reputation: deployment.contracts.ReputationRegistry
      });
      return;
    }
  } catch (error) {
    console.error('Failed to read deployment file:', error);
  }
  
  // Fallback to environment variables
  res.json({
    invoiceNFT: process.env.INVOICE_NFT_ADDRESS,
    funding: process.env.FUNDING_CONTRACT_ADDRESS,
    mockUSDC: process.env.MOCK_USDC_ADDRESS,
    reputation: process.env.REPUTATION_ADDRESS
  });
});

// Handle SPA routing - serve index.html for non-API routes (must be last)
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
const startServer = async () => {
  await initialize();
  
  app.listen(PORT, () => {
    console.log(`\n🚀 DeSupply Backend Server running on port ${PORT}`);
    console.log(`📍 API Base URL: http://localhost:${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log('  POST /api/verify-and-mint - Verify and mint invoice NFT');
    console.log('  GET  /api/invoices/verified - Get all verified invoices');
    console.log('  GET  /api/invoices/:tokenId - Get invoice details');
    console.log('  GET  /api/events/:tokenId - Get invoice events');
    console.log('  GET  /api/contracts - Get contract addresses');
    console.log('  GET  /health - Health check');
  });
};

startServer().catch(console.error);
