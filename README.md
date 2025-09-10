# 🏭 DeSupply - Decentralized Supply Chain Finance Platform

**A blockchain-powered invoice factoring and supply chain finance platform built on Ethereum.**

---

## 🎯 Overview

DeSupply revolutionizes supply chain finance by tokenizing invoices as NFTs, enabling suppliers to get immediate liquidity while providing buyers and lenders with transparent, secure trading mechanisms.

### 🔗 Live Demo
- **🌐 Frontend**: [DeSupply](https://desupply-production.up.railway.app/)
- **⛓️ Smart Contracts**: Deployed on Sepolia Testnet
- **🔧 Backend API**: RESTful API with Oracle integration
- **📊 Repository**: [GitHub - DeSupply](https://github.com/shubhamkr790/desupply)

---

## ✨ Key Features

### 🏪 **For Suppliers**
- Upload and verify invoices
- Mint invoices as tradeable NFTs
- Get immediate liquidity through factoring
- Track invoice lifecycle and payments

### 💰 **For Lenders/Investors**
- Browse verified invoice marketplace
- Fund invoices for returns
- Automated smart contract settlements
- Risk assessment through reputation system

### 🏢 **For Buyers**
- Transparent payment tracking
- Smart contract guaranteed payments
- Reputation building system
- Reduced counterparty risk

---

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Express Backend │    │ Smart Contracts │
│                 │────│                 │────│   (Sepolia)     │
│ • Web3 Wallet   │    │ • Oracle Service│    │ • Invoice NFTs  │
│ • Trading UI    │    │ • File Upload   │    │ • Funding Logic │
│ • Dashboard     │    │ • SQLite DB     │    │ • Mock USDC     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 📦 Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (Build Tool)
- Web3Modal + Wagmi (Web3 Integration)
- React Router (SPA Navigation)

**Backend:**
- Node.js + Express
- SQLite (Database)
- Multer (File Uploads)
- Ethers.js (Blockchain Integration)

**Blockchain:**
- Solidity Smart Contracts
- Hardhat (Development Framework)
- OpenZeppelin (Security Standards)
- Ethereum Sepolia Testnet

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask wallet
- Sepolia ETH (from faucet)

### 🔧 Installation

1. **Clone and Install**
```bash
git clone <repository-url>
cd desupply
npm install
```

2. **Setup Environment**
```bash
# Copy environment template
cp .env.example .env

# Add your keys to .env file
DEPLOYER_PRIVATE_KEY=your_private_key
RPC_URL=your_rpc_endpoint
```

3. **Deploy Smart Contracts**
```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia
```

4. **Start Development Server**
```bash
# Terminal 1: Start backend
cd backend && npm install && npm run dev

# Terminal 2: Start frontend  
cd frontend && npm install && npm run dev
```

5. **Access Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3333
- Health Check: http://localhost:3333/health

---

## 💼 Smart Contracts

### Core Contracts
1. **InvoiceNFT.sol** - ERC-721 tokens representing invoices
2. **Funding.sol** - Handles funding, trading, and settlements
3. **ReputationRegistry.sol** - Tracks user reputation scores
4. **MockUSDC.sol** - Test token for payments

### Key Functions
- `verifyAndMint()` - Oracle verifies and mints invoice NFT
- `fundInvoice()` - Lenders provide liquidity
- `acceptFunding()` - Buyers accept funding terms
- `makePayment()` - Complete invoice payment

---

## 🔄 Workflow

1. **📄 Invoice Creation**
   - Supplier uploads invoice document
   - Oracle service verifies authenticity
   - System mints ERC-721 NFT

2. **💰 Funding**
   - Lenders browse marketplace
   - Fund invoices with USDC
   - Smart contract holds funds in escrow

3. **✅ Acceptance**
   - Buyers review funding terms
   - Accept or reject proposals
   - Automated fund transfer to supplier

4. **💳 Payment**
   - Buyers pay on due date
   - Smart contract releases funds to lender
   - Reputation scores updated

---

## 🛡️ Security Features

- **Oracle Verification** - Server-side invoice validation
- **Multi-signature** - Critical operations require multiple approvals
- **Access Control** - Role-based permissions
- **Audit Trail** - Complete transaction history
- **Rate Limiting** - API protection against abuse

---

## 📊 Testing

```bash
# Run smart contract tests
npx hardhat test

# Run with coverage
npx hardhat coverage

# Deploy and test on local network
npm run test:local
```

---

## 🌐 Deployment

### Production Deployment (Railway)
1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway auto-deploys on push to main branch

### Environment Variables
```
NODE_ENV=production
PORT=3333
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
INVOICE_NFT_ADDRESS=<deployed_contract_address>
FUNDING_CONTRACT_ADDRESS=<deployed_contract_address>
REPUTATION_ADDRESS=<deployed_contract_address>
MOCK_USDC_ADDRESS=<deployed_contract_address>
```

---

## 📚 API Documentation

### Core Endpoints
- `POST /api/verify-and-mint` - Verify and mint invoice NFT
- `GET /api/invoices/verified` - Get marketplace listings
- `GET /api/invoices/:tokenId` - Get invoice details
- `GET /api/contracts` - Get contract addresses
- `GET /health` - Health check

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Team

👥 Team
- Shubham Kumar – Full Stack Blockchain Developer | [GitHub](https://github.com/shubhamkr790) | [LinkedIn](https://linkedin.com/in/shubhamkr790)
- Komal Kumari – Graphic Designer | [LinkedIn](https://linkedin.com/in/komal-kumari-795319298)


---

## 🎉 Acknowledgments

- OpenZeppelin for secure smart contract standards
- Hardhat team for excellent development tools
- Web3Modal for seamless wallet integration
- Railway for reliable hosting platform

---

**🔥 Ready to revolutionize supply chain finance? Deploy DeSupply today!**
