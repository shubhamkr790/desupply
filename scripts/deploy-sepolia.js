const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment to Sepolia testnet...");
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Get balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.1")) {
    console.error("⚠️  Warning: Low balance! You need at least 0.1 ETH for deployment");
    console.log("Get Sepolia ETH from: https://sepoliafaucet.com or https://faucet.sepolia.dev/");
    process.exit(1);
  }

  console.log("\n📝 Deploying contracts...\n");

  // 1. Deploy MockUSDC
  console.log("1. Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", usdcAddress);
  console.log("   View on Etherscan: https://sepolia.etherscan.io/address/" + usdcAddress);

  // 2. Deploy InvoiceNFT
  console.log("\n2. Deploying InvoiceNFT...");
  const InvoiceNFT = await hre.ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.waitForDeployment();
  const nftAddress = await invoiceNFT.getAddress();
  console.log("✅ InvoiceNFT deployed to:", nftAddress);
  console.log("   View on Etherscan: https://sepolia.etherscan.io/address/" + nftAddress);

  // 3. Deploy Funding
  console.log("\n3. Deploying Funding...");
  const Funding = await hre.ethers.getContractFactory("Funding");
  const funding = await Funding.deploy(
    usdcAddress,
    nftAddress
  );
  await funding.waitForDeployment();
  const fundingAddress = await funding.getAddress();
  console.log("✅ Funding deployed to:", fundingAddress);
  console.log("   View on Etherscan: https://sepolia.etherscan.io/address/" + fundingAddress);

  // 4. Deploy ReputationRegistry
  console.log("\n4. Deploying ReputationRegistry...");
  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const reputation = await ReputationRegistry.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("✅ ReputationRegistry deployed to:", reputationAddress);
  console.log("   View on Etherscan: https://sepolia.etherscan.io/address/" + reputationAddress);

  // 5. Configure contracts
  console.log("\n⚙️  Configuring contracts...");
  
  // Set ReputationRegistry in Funding
  console.log("- Setting ReputationRegistry in Funding contract...");
  await funding.setReputationRegistry(reputationAddress);
  
  // Authorize Funding contract to update reputation
  console.log("- Authorizing Funding contract for reputation updates...");
  await reputation.authorizeUpdater(fundingAddress);
  
  // Grant VERIFIER_ROLE to deployer
  console.log("- Granting VERIFIER_ROLE to deployer...");
  const VERIFIER_ROLE = await invoiceNFT.VERIFIER_ROLE();
  await invoiceNFT.grantRole(VERIFIER_ROLE, deployer.address);

  console.log("✅ Configuration complete!");

  // Save deployment info
  const deployment = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockUSDC: usdcAddress,
      InvoiceNFT: nftAddress,
      Funding: fundingAddress,
      ReputationRegistry: reputationAddress
    },
    etherscan: {
      MockUSDC: `https://sepolia.etherscan.io/address/${usdcAddress}`,
      InvoiceNFT: `https://sepolia.etherscan.io/address/${nftAddress}`,
      Funding: `https://sepolia.etherscan.io/address/${fundingAddress}`,
      ReputationRegistry: `https://sepolia.etherscan.io/address/${reputationAddress}`
    }
  };

  // Save to file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, "sepolia.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\n📁 Deployment info saved to:", deploymentPath);

  // Update .env.sepolia file
  const envContent = `# Sepolia Testnet Configuration
NETWORK=sepolia
CHAIN_ID=11155111

# Contract Addresses
MOCK_USDC_ADDRESS=${usdcAddress}
INVOICE_NFT_ADDRESS=${nftAddress}
FUNDING_CONTRACT_ADDRESS=${fundingAddress}
REPUTATION_ADDRESS=${reputationAddress}

# Deployer Account
DEPLOYER_ADDRESS=${deployer.address}

# RPC URL
SEPOLIA_RPC_URL=${process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org"}

# API URLs
BACKEND_URL=${process.env.BACKEND_URL || "http://localhost:3333"}
`;

  fs.writeFileSync(path.join(__dirname, "..", ".env.sepolia"), envContent);
  console.log("✅ .env.sepolia file created with contract addresses");

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📝 Contract Addresses:");
  console.log("  MockUSDC:", usdcAddress);
  console.log("  InvoiceNFT:", nftAddress);
  console.log("  Funding:", fundingAddress);
  console.log("  ReputationRegistry:", reputationAddress);
  console.log("\n🔗 View on Sepolia Etherscan:");
  Object.entries(deployment.etherscan).forEach(([name, url]) => {
    console.log(`  ${name}: ${url}`);
  });
  console.log("\n✨ Your DeFi Supply Chain Finance platform is now live on Sepolia!");
  console.log("\n📌 Next Steps:");
  console.log("  1. Update frontend/.env with VITE_CHAIN_ID=11155111");
  console.log("  2. Update frontend/.env with VITE_RPC_URL=https://rpc.sepolia.org");
  console.log("  3. Get test ETH from: https://sepoliafaucet.com");
  console.log("  4. Import test accounts to MetaMask");
  console.log("  5. Start using the platform!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
