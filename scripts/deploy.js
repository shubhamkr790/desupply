const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance));

  // Deploy MockUSDC
  console.log("\n1. Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("MockUSDC deployed to:", mockUSDCAddress);

  // Deploy InvoiceNFT
  console.log("\n2. Deploying InvoiceNFT...");
  const InvoiceNFT = await hre.ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.waitForDeployment();
  const invoiceNFTAddress = await invoiceNFT.getAddress();
  console.log("InvoiceNFT deployed to:", invoiceNFTAddress);

  // Deploy Funding
  console.log("\n3. Deploying Funding...");
  const Funding = await hre.ethers.getContractFactory("Funding");
  const funding = await Funding.deploy(mockUSDCAddress, invoiceNFTAddress);
  await funding.waitForDeployment();
  const fundingAddress = await funding.getAddress();
  console.log("Funding deployed to:", fundingAddress);

  // Deploy ReputationRegistry
  console.log("\n4. Deploying ReputationRegistry...");
  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy();
  await reputationRegistry.waitForDeployment();
  const reputationAddress = await reputationRegistry.getAddress();
  console.log("ReputationRegistry deployed to:", reputationAddress);

  // Configure contracts
  console.log("\n5. Configuring contracts...");
  
  // Set reputation registry in funding contract
  await funding.setReputationRegistry(reputationAddress);
  console.log("- Set ReputationRegistry in Funding contract");

  // Authorize funding contract to update reputation
  await reputationRegistry.authorizeUpdater(fundingAddress);
  console.log("- Authorized Funding contract as reputation updater");

  // Grant VERIFIER_ROLE to deployer for testing
  const VERIFIER_ROLE = await invoiceNFT.VERIFIER_ROLE();
  await invoiceNFT.grantRole(VERIFIER_ROLE, deployer.address);
  console.log("- Granted VERIFIER_ROLE to deployer");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockUSDC: mockUSDCAddress,
      InvoiceNFT: invoiceNFTAddress,
      Funding: fundingAddress,
      ReputationRegistry: reputationAddress
    }
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentPath = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n✅ Deployment complete!");
  console.log("Deployment info saved to:", deploymentPath);
  
  console.log("\n📝 Contract Addresses:");
  console.log("========================");
  console.log("MockUSDC:", mockUSDCAddress);
  console.log("InvoiceNFT:", invoiceNFTAddress);
  console.log("Funding:", fundingAddress);
  console.log("ReputationRegistry:", reputationAddress);
  console.log("========================\n");

  // Update .env file with contract addresses
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  
  envContent = envContent.replace(/MOCK_USDC_ADDRESS=.*/g, `MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
  envContent = envContent.replace(/INVOICE_NFT_ADDRESS=.*/g, `INVOICE_NFT_ADDRESS=${invoiceNFTAddress}`);
  envContent = envContent.replace(/FUNDING_CONTRACT_ADDRESS=.*/g, `FUNDING_CONTRACT_ADDRESS=${fundingAddress}`);
  envContent = envContent.replace(/REPUTATION_ADDRESS=.*/g, `REPUTATION_ADDRESS=${reputationAddress}`);
  
  fs.writeFileSync(envPath, envContent);
  console.log("\n✅ .env file updated with contract addresses");
  
  console.log("\nContract addresses:");
  console.log(`MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
  console.log(`INVOICE_NFT_ADDRESS=${invoiceNFTAddress}`);
  console.log(`FUNDING_CONTRACT_ADDRESS=${fundingAddress}`);
  console.log(`REPUTATION_ADDRESS=${reputationAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
